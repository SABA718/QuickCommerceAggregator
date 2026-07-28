import SuperTokens from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import Passwordless from 'supertokens-auth-react/recipe/passwordless';

export function initSuperTokens() {
  SuperTokens.init({
    appInfo: {
      appName: 'DealDock',
      apiDomain: 'http://localhost:3000',
      websiteDomain: 'http://localhost:5173',
      apiBasePath: '/auth',
      websiteBasePath: '/auth',
    },
    recipeList: [
      Passwordless.init({
        contactMethod: 'PHONE',
      }),
      Session.init(),
    ],
  });
}