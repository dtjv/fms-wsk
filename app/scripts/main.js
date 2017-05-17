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

    const PLUS = '+';
    const ICON_PLUS = 'add';
    // const MINUS = '-';
    const ICON_MINUS = 'remove';

    const app = {
      user: null,
      views: {
        $signIn: $('#signin-view'),
        $clientList: $('#client-list-view'),
        $clientDetail: $('#client-detail-view'),
        $editAssessment: $('#edit-assessment-view'),
      },
      clients: [],
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
      app.showEditAssessmentView();
    });

    $('#btn-submit').on('click', function(e) {
      e.preventDefault();
      app.saveAssessment(app.user)
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
      app.showClientDetailView($target.data('client-id'));
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
            route: '/list',
          }, 'FMS', '/list');
        });
    };

    app.showEditAssessmentView = function() {
      app.toggleViewOn(app.views.$editAssessment);
      window.history.pushState({
        route: '/edit',
      }, 'FMS', '/edit');
    };

    app.showClientDetailView = function(clientId) {
      const client = app.clients.filter((client) => client.id === clientId);
      app.buildClientDetailView(client[0]);
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
                    raw: 2,
                    final: 2,
                  },
                  notes: 'kness fold in',
                },
                hs: {
                  scores: {
                    rawLeft: 3,
                    rawRight: 2,
                    final: 2,
                  },
                  notes: 'all is ok',
                },
                il: {
                  scores: {
                    rawLeft: 0,
                    rawRight: 2,
                    final: 0,
                  },
                  notes: 'pain!!',
                },
                sm: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 3,
                    final: 1,
                  },
                  notes: 'shoulders move ok',
                },
                sct: {
                  scores: {
                    rawLeft: '-',
                    rawRight: '-',
                    final: '-',
                  },
                  notes: 'pass',
                },
                aslr: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 1,
                    final: 1,
                  },
                  notes: 'aslr',
                },
                tsp: {
                  scores: {
                    raw: 3,
                    final: 3,
                  },
                  notes: 'push-ups are okay',
                },
                ect: {
                  scores: {
                    raw: '+',
                    final: '+',
                  },
                  notes: 'all bad!!',
                },
                rs: {
                  scores: {
                    rawLeft: 1,
                    rawRight: 2,
                    final: 1,
                  },
                  notes: 'rotary stability ..........',
                },
                fct: {
                  scores: {
                    raw: '-',
                    final: '-',
                  },
                  notes: 'flexed',
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

    app.buildClientDetailView = function(client) {
      const populateClient = function($el) {
        $el
          .find('#client-name-read')
          .text(`${client.firstName} ${client.lastName}`);
        $el
          .find('#client-score-read')
          .text(`${client.score}`);
        $el
          .find('#client-notes-read span')
          .text(`${client.notes}`);
      };

      const populateDS = function($el) {
        $el
          .find('#ds-score-read')
          .text(`${screens['ds'].scores.final}`);
        $el
          .find('#ds-notes-read')
          .text(`${screens['ds'].notes}`);
      };

      const populateHS = function($el) {
        $el
          .find('#hs-score-read')
          .text(`${screens['hs'].scores.final}`);
        $el
          .find('#hs-notes-read')
          .text(`${screens['hs'].notes}`);
        $el
          .find('#hs-raw-score-left-read')
          .text(`${screens['hs'].scores.rawLeft}`);
        $el
          .find('#hs-raw-score-right-read')
          .text(`${screens['hs'].scores.rawRight}`);
      };

      const populateIL = function($el) {
        $el
          .find('#il-score-read')
          .text(`${screens['il'].scores.final}`);
        $el
          .find('#il-notes-read')
          .text(`${screens['il'].notes}`);
        $el
          .find('#il-raw-score-left-read')
          .text(`${screens['il'].scores.rawLeft}`);
        $el
          .find('#il-raw-score-right-read')
          .text(`${screens['il'].scores.rawRight}`);
      };

      const populateSM = function($el) {
        $el
          .find('#sm-score-read')
          .text(`${screens['sm'].scores.final}`);
        $el
          .find('#sm-notes-read')
          .text(`${screens['sm'].notes}`);
        $el
          .find('#sm-raw-score-left-read')
          .text(`${screens['sm'].scores.rawLeft}`);
        $el
          .find('#sm-raw-score-right-read')
          .text(`${screens['sm'].scores.rawRight}`);
      };

      const populateSCT = function($el) {
        $el
          .find('#sct-score-read')
          .text(`
            ${screens['sct'].scores.final === PLUS
              ? ICON_PLUS
              : ICON_MINUS}
          `);
        $el
          .find('#sct-notes-read')
          .text(`${screens['sct'].notes}`);
        $el
          .find('#sct-raw-score-left-read')
          .text(`
            ${screens['sct'].scores.rawLeft === PLUS
              ? ICON_PLUS
              : ICON_MINUS}
          `);
        $el
          .find('#sct-raw-score-right-read')
          .text(`
            ${screens['sct'].scores.rawRight === PLUS
              ? ICON_PLUS
              : ICON_MINUS}
          `);
      };

      const populateASLR = function($el) {
        $el
          .find('#aslr-score-read')
          .text(`${screens['aslr'].scores.final}`);
        $el
          .find('#aslr-notes-read')
          .text(`${screens['aslr'].notes}`);
        $el
          .find('#aslr-raw-score-left-read')
          .text(`${screens['aslr'].scores.rawLeft}`);
        $el
          .find('#aslr-raw-score-right-read')
          .text(`${screens['aslr'].scores.rawRight}`);
      };

      const populateTSP = function($el) {
        $el
          .find('#tsp-score-read')
          .text(`${screens['tsp'].scores.final}`);
        $el
          .find('#tsp-notes-read')
          .text(`${screens['tsp'].notes}`);
      };

      const populateECT = function($el) {
        $el
          .find('#ect-score-read')
          .text(`
            ${screens['ect'].scores.final === PLUS
              ? ICON_PLUS
              : ICON_MINUS}
          `);
        $el
          .find('#ect-notes-read')
          .text(`${screens['ect'].notes}`);
      };

      const populateRS = function($el) {
        $el
          .find('#rs-score-read')
          .text(`${screens['rs'].scores.final}`);
        $el
          .find('#rs-notes-read')
          .text(`${screens['rs'].notes}`);
        $el
          .find('#rs-raw-score-left-read')
          .text(`${screens['rs'].scores.rawLeft}`);
        $el
          .find('#rs-raw-score-right-read')
          .text(`${screens['rs'].scores.rawRight}`);
      };

      const populateFCT = function($el) {
        $el
          .find('#fct-score-read')
          .text(`
            ${screens['fct'].scores.final === PLUS
              ? ICON_PLUS
              : ICON_MINUS}
          `);
        $el
          .find('#fct-notes-read')
          .text(`${screens['fct'].notes}`);
      };

      const screens = client.assessments[0].screens;

      const $clientEl = app
        .views
        .$clientDetail
        .find('#client-read');

      populateClient($clientEl);

      app
        .views
        .$clientDetail
        .find('.screen')
        .each(function(index, screen) {
          const $screen = $(screen);

          switch ($screen.attr('id')) {
            case 'ds-read':
              return populateDS($screen);
            case 'hs-read':
              return populateHS($screen);
            case 'il-read':
              return populateIL($screen);
            case 'sm-read':
              return populateSM($screen);
            case 'sct-read':
              return populateSCT($screen);
            case 'aslr-read':
              return populateASLR($screen);
            case 'tsp-read':
              return populateTSP($screen);
            case 'ect-read':
              return populateECT($screen);
            case 'rs-read':
              return populateRS($screen);
            case 'fct-read':
              return populateFCT($screen);
            default:
              return undefined;
          }
        });
    };

    app.saveAssessment = function(user) {
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
          case '/list':
            app.showClientListView(app.user);
            break;
          case '/detail':
            app.showClientDetailView(app.selectedClient);
            break;
          case '/edit':
            app.showEditAssessmentView();
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
