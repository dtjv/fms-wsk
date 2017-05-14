/*
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

/* eslint-env browser */

(function() {
  'use strict';

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  const isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          const installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;
              case 'redundant':
                throw new Error('The service worker became redundant.');
              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  // ---------------------------------------------------------------------------
  //
  // app specific
  //
  // ---------------------------------------------------------------------------
  (function(window) {
    'use strict';

    const app = {
      user: null,
      views: {
        $signIn: $('#signin-view'),
        $clientList: $('#client-list-view'),
        $newScreen: $('#new-screen-view'),
        $clientDetail: $('#client-detail-view'),
      },
      clients: {},
    };

    // -------------------------------------------------------------------------
    //
    // register event listeners
    //
    // ideally...
    //
    // when someone clicks a button, the application state should change. then
    // the app re-renders based on the new app state.
    // -------------------------------------------------------------------------
    $('.btn-google').on('click', function(e) {
      e.preventDefault();
      app.signIn()
        .then((user) => app.showClientListView(app.user))
        .catch((error) => console.error(`error during signin: ${error}`));
    });

    $('#btn-add-screen').on('click', function(e) {
      e.preventDefault();
      app.showNewScreenView();
    });

    $('#btn-submit').on('click', function(e) {
      e.preventDefault();
      app.saveNewScreen(app.user)
        .then(() => app.showClientListView(app.user))
        .catch((error) => console.error(`error saving new screen: ${error}`));
    });

    $('#btn-cancel').on('click', function(e) {
      e.preventDefault();
      app.showClientListView(app.user);
    });

    $('.card-panel').on('click', function(e) {
      e.preventDefault();
      let $target = $(e.target);

      if (!$target.hasClass('card-panel')) {
        $target = $target.parent();
      }

      app.showClientDetailView($target.data().client);
    });

    $('#btn-close-detail').on('click', function(e) {
      e.preventDefault();
      app.showClientListView(app.user);
    });

    // -------------------------------------------------------------------------
    //
    // app methods
    //
    // -------------------------------------------------------------------------

    app.showSignInView = function() {
      console.log('** showSignInView **');
      app.toggleViewOn(app.views.$signIn);
    };

    app.showClientListView = function(user) {
      console.log('** showClientListView **');
      return app
        .fetchClients(user)
        .then((clients) => {
          app.buildClientListView(clients);
          app.toggleViewOn(app.views.$clientList);
        });
    };

    app.showNewScreenView = function() {
      console.log('** showNewScreenView **');
      app.toggleViewOn(app.views.$newScreen);
    };

    app.showClientDetailView = function(client) {
      console.log('** showClientDetailView **');
      console.log(`...client: ${JSON.stringify(client)}`);
      app.toggleViewOn(app.views.$clientDetail);
    };

    app.signIn = function() {
      app.user = 'David';
      return Promise.resolve(app.user);
    };

    app.fetchClients = function(user) {
      console.log(`...fetch clients for trainer ${user}`);
      return Promise.resolve({});
    };

    app.buildClientListView = function(clients) {
      console.log(`...loading clients into view`);
    };

    app.saveNewScreen = function(user) {
      console.log(`...saving new screen for trainer ${user}`);
      return Promise.resolve(true);
    };

    app.toggleViewOn = function($targetView) {
      Object.values(app.views).forEach(($view) => {
        if ($targetView[0] === $view[0]) {
          $view.removeClass('hide');
        } else {
          $view.addClass('hide');
        }
      });
    };

    // -------------------------------------------------------------------------
    //
    // startup
    //
    // -------------------------------------------------------------------------
    window.fms = app;

    if (!app.user) {
      app.showSignInView();
    } else {
      app.showClientListView(app.user);
    }
  })(window);
})();
