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
      clients: [],
      selectedClient: null,
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
      app.selectedClient = $target.data().client;
      app.showClientDetailView(app.selectedClient);
    });

    $('#btn-close-detail').on('click', function(e) {
      e.preventDefault();
      app.showClientListView(app.user);
    });

    $('.brand-logo').on('click', function(e) {
      e.preventDefault();
      app.startup();
    });

    // -------------------------------------------------------------------------
    //
    // app methods
    //
    // -------------------------------------------------------------------------

    app.showSignInView = function() {
      app.toggleViewOn(app.views.$signIn);
      window.history.pushState({
        route: '/sign-in',
      }, 'FMS', '/sign-in');
    };

    app.showClientListView = function(user) {
      return app
        .fetchClients(user)
        .then((clients) => {
          app.buildClientListView(clients);
          app.toggleViewOn(app.views.$clientList);
          window.history.pushState({
            route: '/client-list',
          }, 'FMS', '/client-list');
        });
    };

    app.showNewScreenView = function() {
      app.toggleViewOn(app.views.$newScreen);
      window.history.pushState({
        route: '/new-screen',
      }, 'FMS', '/new-screen');
    };

    app.showClientDetailView = function(client) {
      app.toggleViewOn(app.views.$clientDetail);
      window.history.pushState({
        route: '/client-detail',
      }, 'FMS', '/client-detail');
    };

    app.signIn = function() {
      app.user = 'David';
      return Promise.resolve(app.user);
    };

    app.fetchClients = function(user) {
      const clients = [
        {
          id: '00005',
          firstName: 'Peter',
          lastName: 'Piper',
          score: 10,
          notes: 'peter piper notes...',
          assessments: [
            {
              date: '05-16-2017',
              screens: {
                ds: {
                  scores: {
                    raw: 1,
                    final: 1,
                  },
                  notes: 'deep squat note...',
                },
                hs: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'hurdle step note...',
                },
                il: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'inline lunge note...',
                },
                sm: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'shoulder mobility note...',
                },
                sct: {
                  scores: {
                    rawLeft: '-',
                    rawRight: '+',
                    final: '+',
                  },
                  notes: 'shoulder clearing test note...',
                },
                aslr: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'active straight leg raise note...',
                },
                tsp: {
                  scores: {
                    raw: 1,
                    final: 1,
                  },
                  notes: 'trunk stability push-ups note...',
                },
                ect: {
                  scores: {
                    raw: '-',
                    final: '-',
                  },
                  notes: 'extension clearning test note...',
                },
                rs: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'rotary stability note...',
                },
                fct: {
                  scores: {
                    raw: '-',
                    final: '-',
                  },
                  notes: 'flexion clearing test...',
                },
              },
            },
          ],
        },
        {
          id: '00006',
          firstName: 'Hans',
          lastName: 'Gruber',
          score: 14,
          notes: 'hans gruber notes...',
          assessments: [
            {
              date: '05-16-2017',
              screens: {
                ds: {
                  scores: {
                    raw: 1,
                    final: 1,
                  },
                  notes: 'deep squat note...',
                },
                hs: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'hurdle step note...',
                },
                il: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'inline lunge note...',
                },
                sm: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'shoulder mobility note...',
                },
                sct: {
                  scores: {
                    rawLeft: '-',
                    rawRight: '+',
                    final: '+',
                  },
                  notes: 'shoulder clearing test note...',
                },
                aslr: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'active straight leg raise note...',
                },
                tsp: {
                  scores: {
                    raw: 1,
                    final: 1,
                  },
                  notes: 'trunk stability push-ups note...',
                },
                ect: {
                  scores: {
                    raw: '-',
                    final: '-',
                  },
                  notes: 'extension clearning test note...',
                },
                rs: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'rotary stability note...',
                },
                fct: {
                  scores: {
                    raw: '-',
                    final: '-',
                  },
                  notes: 'flexion clearing test...',
                },
              },
            },
          ],
        },
      ];

      if (!app.clients.length) {
        // no clients yet, so
        // ...go fetch (which is an async process)
        // ...set app state
        app.clients = clients;
        return Promise.resolve(clients);
      }

      return Promise.resolve(app.clients);
    };

    app.buildClientListView = function(clients = []) {
      let clientsToAdd;
      const $clientList = app.views.$clientList.find('.row');

      // determine clients to add to ui. initially, its all clients. then it's
      // clients added via new screens submitted. basically, we sync ui w/ app
      // state.
      if ($clientList.children().length) {
        const clientsById = {};

        $clientList.children().each(function(idx, child) {
          let clientId = $(child).find('.card-panel').data('client-id');

          if (clientId) {
            clientsById[clientId] = true;
          }
        });
        clientsToAdd = clients.filter((client) => !clientsById[client.id]);
      } else {
        clientsToAdd = clients.slice();
      }

      clientsToAdd
        .map((client) => {
          const $clone = $('.client-template').clone(true);
          $clone.removeClass('client-template hide');
          $clone.find('.client-name').text(client.firstName);
          $clone.find('.client-score').text(client.score);
          $clone.find('.card-panel').data('client-id', client.id);
          return $clone;
        })
        .forEach(($client) => {
          $clientList.append($client);
        });
    };

    app.saveNewScreen = function(user) {
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

    app.startup = function() {
      if (!app.user) {
        app.showSignInView();
      } else {
        app.showClientListView(app.user);
      }
    };

    window.onpopstate = function({state}) {
      if (state) {
        const {route} = state;

        switch (route) {
          case '/':
          case '/sign-in':
            if (app.user) {
              app.showClientListView(app.user);
            } else {
              app.showSignInView();
            }
            break;
          case '/client-list':
            app.showClientListView(app.user);
            break;
          case '/client-detail':
            app.showClientDetailView(app.selectedClient);
            break;
          case '/new-screen':
            app.showNewScreenView();
            break;
          default:
            break;
        };
      }
    };

    // -------------------------------------------------------------------------
    //
    // startup
    //
    // -------------------------------------------------------------------------
    window.fms = app;
    app.startup();
  })(window);
})();
