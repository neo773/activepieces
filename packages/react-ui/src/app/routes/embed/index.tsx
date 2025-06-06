import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectOnce } from 'react-use';

import { useEmbedding } from '@/components/embed-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { authenticationSession } from '@/lib/authentication-session';
import { managedAuthApi } from '@/lib/managed-auth-api';
import { parentWindow } from '@/lib/utils';
import {
  _AP_JWT_TOKEN_QUERY_PARAM_NAME,
  ActivepiecesClientAuthenticationFailed,
  ActivepiecesClientAuthenticationSuccess,
  ActivepiecesClientConfigurationFinished,
  ActivepiecesClientEventName,
  ActivepiecesClientInit,
  ActivepiecesVendorEventName,
  ActivepiecesVendorInit,
} from 'ee-embed-sdk';

const notifyVendorPostAuthentication = () => {
  const authenticationSuccessEvent: ActivepiecesClientAuthenticationSuccess = {
    type: ActivepiecesClientEventName.CLIENT_AUTHENTICATION_SUCCESS,
    data: {},
  };
  parentWindow.postMessage(authenticationSuccessEvent, '*');
  const configurationFinishedEvent: ActivepiecesClientConfigurationFinished = {
    type: ActivepiecesClientEventName.CLIENT_CONFIGURATION_FINISHED,
    data: {},
  };
  parentWindow.postMessage(configurationFinishedEvent, '*');
};

const EmbedPage = React.memo(() => {
  const navigate = useNavigate();
  const { setEmbedState, embedState } = useEmbedding();
  const { mutateAsync } = useMutation({
    mutationFn: managedAuthApi.generateApToken,
  });
  const initState = (event: MessageEvent<ActivepiecesVendorInit>) => {
    if (
      event.source === parentWindow &&
      event.data.type === ActivepiecesVendorEventName.VENDOR_INIT
    ) {
      const token =
        event.data.data.jwtToken || getExternalTokenFromSearchQuery();
      if (token) {
        mutateAsync(
          {
            externalAccessToken: token,
          },
          {
            onSuccess: (data) => {
              authenticationSession.saveResponse(data, true);
              const initialRoute = event.data.data.initialRoute ?? '/';
              setEmbedState({
                hideSideNav: event.data.data.hideSidebar,
                isEmbedded: true,
                hideLogoInBuilder: event.data.data.hideLogoInBuilder ?? false,
                hideFlowNameInBuilder:
                  event.data.data.hideFlowNameInBuilder ?? false,
                prefix: event.data.data.prefix,
                disableNavigationInBuilder:
                  event.data.data.disableNavigationInBuilder !== false,
                hideFolders: event.data.data.hideFolders ?? false,
                sdkVersion: event.data.data.sdkVersion,
                fontUrl: event.data.data.fontUrl,
                fontFamily: event.data.data.fontFamily,
                useDarkBackground:
                  initialRoute.startsWith('/embed/connections'),
                hideExportAndImportFlow:
                  event.data.data.hideExportAndImportFlow ?? false,
                hideHomeButtonInBuilder:
                  event.data.data.disableNavigationInBuilder ===
                  'keep_home_button_only'
                    ? false
                    : event.data.data.disableNavigationInBuilder,
                emitHomeButtonClickedEvent:
                  event.data.data.emitHomeButtonClickedEvent ?? false,
              });

              //previously initialRoute was optional
              navigate(initialRoute);
              notifyVendorPostAuthentication();
            },
            onError: (error) => {
              const errorEvent: ActivepiecesClientAuthenticationFailed = {
                type: ActivepiecesClientEventName.CLIENT_AUTHENTICATION_FAILED,
                data: error,
              };
              parentWindow.postMessage(errorEvent, '*');
            },
          },
        );
      } else {
        console.error('Token sent via the sdk is empty');
      }
    }
  };

  const getExternalTokenFromSearchQuery = () => {
    return new URLSearchParams(window.location.search).get(
      _AP_JWT_TOKEN_QUERY_PARAM_NAME,
    );
  };

  useEffectOnce(() => {
    const event: ActivepiecesClientInit = {
      type: ActivepiecesClientEventName.CLIENT_INIT,
      data: {},
    };
    parentWindow.postMessage(event, '*');
    window.addEventListener('message', initState);
    return () => {
      window.removeEventListener('message', initState);
    };
  });

  return <LoadingScreen brightSpinner={embedState.useDarkBackground} />;
});

EmbedPage.displayName = 'EmbedPage';
export { EmbedPage };
