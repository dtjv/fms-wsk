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
    const MINUS = '-';
    const ICON_PLUS = 'add';
    const ICON_MINUS = 'remove';

    const app = {
      user: null,
      views: {
        $signIn: $('#signin-view'),
        $clientList: $('#client-list-view'),
        $clientDetail: $('#client-detail-view'),
        $editAssessment: $('#edit-assessment-view'),
      },
      clients: null,
      refs: {
        clients: null,
      },
      firebase: {
        auth: firebase.auth(),
        db: firebase.database(),
      },
    };

    // -------------------------------------------------------------------------
    //
    // register event listeners
    //
    // -------------------------------------------------------------------------
    $('.btn-google').on('click', function(e) {
      e.preventDefault();
      app.signIn();
    });

    $('#btn-add-screen').on('click', function(e) {
      e.preventDefault();
      app.showEditAssessmentView();
    });

    $('#btn-submit').on('click', function(e) {
      e.preventDefault();
      const fields = {};

      $.each($('form').serializeArray(), function(i, {name, value}) {
        fields[name] = value;
      });

      // validate fields
      if (!fields['client-first-name']) {
        return Materialize
          .toast('Please provide client\'s first name.', 2000, '', () => {
            $('#first-name-edit').focus();
          });
      }

      if (!fields['client-last-name']) {
        return Materialize
          .toast('Please provide client\'s last name.', 2000, '', () => {
            $('#last-name-edit').focus();
          });
      }

      fields['client-score'] = app.calculateFinalScore(fields);

      app.saveAssessment(fields, function() {
        app.showClientListView(app.user);
      });
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

    $('#btn-edit-detail').on('click', function(e) {
      e.preventDefault();
      const clientId = app
        .views
        .$clientDetail
        .find('#client-read')
        .data('client-id');

      app.showEditAssessmentView(clientId);
    });

    $('.brand-logo').on('click', function(e) {
      e.preventDefault();
      app.startup();
    });

    $('.logout').on('click', function(e) {
      e.preventDefault();
      app.signOut();
    });

    $('#ds-raw-score-edit').on('change', function(e) {
      const score = $(e.target).val();
      $('#ds-score-edit').val(score);
      $('#ds-score').text(score);
    });

    $('#hs-edit select').on('change', function(e) {
      const rawScoreLeft = $('#hs-raw-score-left-edit').val();
      const rawScoreRight = $('#hs-raw-score-right-edit').val();

      let score;

      if (rawScoreLeft !== null) {
        score = (rawScoreRight !== null)
                ? Math.min(rawScoreLeft, rawScoreRight)
                : rawScoreLeft;
      } else if (rawScoreRight !== null) {
        score = rawScoreRight;
      }

      if (score !== null) {
        $('#hs-score-edit').val(score);
        $('#hs-score').text(score);
      }
    });

    $('#il-edit select').on('change', function(e) {
      const rawScoreLeft = $('#il-raw-score-left-edit').val();
      const rawScoreRight = $('#il-raw-score-right-edit').val();

      let score;

      if (rawScoreLeft !== null) {
        score = (rawScoreRight !== null)
                ? Math.min(rawScoreLeft, rawScoreRight)
                : rawScoreLeft;
      } else if (rawScoreRight !== null) {
        score = rawScoreRight;
      }

      if (score !== null) {
        $('#il-score-edit').val(score);
        $('#il-score').text(score);
      }
    });

    $('#sm-edit select').on('change', function(e) {
      const rawScoreLeft = $('#sm-raw-score-left-edit').val();
      const rawScoreRight = $('#sm-raw-score-right-edit').val();

      let score;

      if (rawScoreLeft !== null) {
        score = (rawScoreRight !== null)
                ? Math.min(rawScoreLeft, rawScoreRight)
                : rawScoreLeft;
      } else if (rawScoreRight !== null) {
        score = rawScoreRight;
      }

      if (score !== null) {
        $('#sm-score-edit').val(score);
        $('#sm-score').text(score);
      }
    });

    $('#sct-raw-score-left-edit input').on('change', function() {
      const $rawScoreLeft = $('#sct-raw-score-left-edit input');
      const $rawScoreRight = $('#sct-raw-score-right-edit input');
      const $scoreShow = $('#sct-score');
      const $scoreField = $('#sct-score-edit');

      if ($rawScoreLeft.is(':checked')) {
        $scoreShow.text('add');
        $scoreShow.addClass(ICON_PLUS);
        $scoreShow.removeClass(ICON_MINUS);
        $scoreField.val(PLUS);
      } else if (!$rawScoreRight.is(':checked')) {
        $scoreShow.text('remove');
        $scoreShow.addClass(ICON_MINUS);
        $scoreShow.removeClass(ICON_PLUS);
        $scoreField.val(MINUS);
      }
    });

    $('#sct-raw-score-right-edit input').on('change', function() {
      const $rawScoreLeft = $('#sct-raw-score-left-edit input');
      const $rawScoreRight = $('#sct-raw-score-right-edit input');
      const $scoreShow = $('#sct-score');
      const $scoreField = $('#sct-score-edit');

      if ($rawScoreRight.is(':checked')) {
        $scoreShow.text('add');
        $scoreField.val(PLUS);
      } else if (!$rawScoreLeft.is(':checked')) {
        $scoreShow.text('remove');
        $scoreField.val(MINUS);
      }
    });

    $('#aslr-edit select').on('change', function(e) {
      const rawScoreLeft = $('#aslr-raw-score-left-edit').val();
      const rawScoreRight = $('#aslr-raw-score-right-edit').val();

      let score;

      if (rawScoreLeft !== null) {
        score = (rawScoreRight !== null)
                ? Math.min(rawScoreLeft, rawScoreRight)
                : rawScoreLeft;
      } else if (rawScoreRight !== null) {
        score = rawScoreRight;
      }

      if (score !== null) {
        $('#aslr-score-edit').val(score);
        $('#aslr-score').text(score);
      }
    });

    $('#tsp-raw-score-edit').on('change', function(e) {
      const score = $(e.target).val();
      $('#tsp-score-edit').val(score);
      $('#tsp-score').text(score);
    });

    $('#ect-raw-score-edit input').on('change', function(e) {
      const $rawScore = $(e.target);
      const $scoreShow = $('#ect-score');
      const $scoreField = $('#ect-score-edit');

      if ($rawScore.is(':checked')) {
        $scoreShow.text('add');
        $scoreField.val(PLUS);
      } else {
        $scoreShow.text('remove');
        $scoreField.val(MINUS);
      }
    });

    $('#rs-edit select').on('change', function(e) {
      const rawScoreLeft = $('#rs-raw-score-left-edit').val();
      const rawScoreRight = $('#rs-raw-score-right-edit').val();

      let score;

      if (rawScoreLeft !== null) {
        score = (rawScoreRight !== null)
                ? Math.min(rawScoreLeft, rawScoreRight)
                : rawScoreLeft;
      } else if (rawScoreRight !== null) {
        score = rawScoreRight;
      }

      if (score !== null) {
        $('#rs-score-edit').val(score);
        $('#rs-score').text(score);
      }
    });

    $('#fct-raw-score-edit input').on('change', function(e) {
      const $rawScore = $(e.target);
      const $scoreShow = $('#fct-score');
      const $scoreField = $('#fct-score-edit');

      if ($rawScore.is(':checked')) {
        $scoreShow.text('add');
        $scoreField.val(PLUS);
      } else {
        $scoreShow.text('remove');
        $scoreField.val(MINUS);
      }
    });

    // -------------------------------------------------------------------------
    //
    // app methods
    //
    // -------------------------------------------------------------------------
    app.registerDataListener = function(cb) {
      if (!app.refs.client) {
        const trainerId = app.firebase.auth.currentUser.uid;
        app.refs.client = app.firebase.db.ref(`/clients/${trainerId}/`);

        app.refs.client.on('value', function(snapshot) {
          app.clients = snapshot.val();
          cb();
        });
      }
    };

    app.onAuthStateChanged = function(user) {
      if (user) {
        app.user = user.displayName;
        app.registerDataListener(function() {
          app.showClientListView(app.user);
        });
        $('.logout').removeClass('hide');
      } else {
        app.user = null;
        app.showSignInView();
        $('.logout').addClass('hide');
      }
    };

    app.signIn = function() {
      const provider = new firebase.auth.GoogleAuthProvider();
      app.firebase.auth.signInWithPopup(provider);
    };

    app.signOut = function() {
      app.firebase.auth.signOut();
    };

    app.showSignInView = function() {
      app.toggleViewOn(app.views.$signIn);
      window.history.pushState({
        route: '/sign-in',
      }, 'FMS', '/sign-in');
    };

    app.showClientListView = function(user) {
      app.buildClientListView(app.clients);
      app.toggleViewOn(app.views.$clientList);
      window.history.pushState({
        route: '/list',
      }, 'FMS', '/list');
    };

    app.showEditAssessmentView = function(clientId) {
      $('form')[0].reset();

      if (clientId) {
        console.log(`load client id: ${clientId}`);
      }

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
        route: '/detail',
      }, 'FMS', '/detail');
    };

    app.buildClientListView = function(clients = {}) {
      const clientsById = {};
      const $clientList = app.views.$clientList.find('.row');

      $clientList.children().each(function(idx, child) {
        let clientId = $(child).find('.card-panel').data('client-id');

        if (clientId) {
          clientsById[clientId] = true;
        }
      });

      const clientsToAdd = Object.entries(clients)
        .filter(([id]) => !clientsById[id]);

      clientsToAdd
        .map(([id, client]) => {
          const $clone = $('.client-template').clone(true);
          $clone
            .removeClass('client-template hide');
          $clone
            .find('.client-name')
            .text(`${client.firstName} ${client.lastName}`);
          $clone
            .find('.client-score')
            .text(client.score);
          $clone
            .find('.client-notes')
            .text(client.notes);
          $clone
            .find('.card-panel')
            .data('client-id', id);
          return $clone;
        })
        .forEach(($client) => {
          $clientList.append($client);
        });
    };

    app.buildClientDetailView = function(client) {
      const populateClient = function($el) {
        $el
          .data('client-id', client.id);
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

    app.calculateFinalScore = function(fields) {
      let score = 0;

      score += Number(fields['ds-score']);
      score += Number(fields['hs-score']);
      score += Number(fields['il-score']);
      score += Number(fields['sm-score']);
      score += Number(fields['aslr-score']);
      score += Number(fields['tsp-score']);
      score += Number(fields['rs-score']);

      return score.toString();
    };

    app.saveAssessment = function(fields, done) {
      const trainerId = app.firebase.auth.currentUser.uid;
      const clientsRef = app.firebase.db.ref('clients');
      const assessmentsRef = app.firebase.db.ref('assessments');

      const client = {
        firstName: fields['client-first-name'],
        lastName: fields['client-last-name'],
        score: fields['client-score'],
        notes: fields['client-notes'],
      };

      const assessment = Object.assign({}, fields);
      delete assessment['client-first-name'];
      delete assessment['client-last-name'];
      delete assessment['client-score'];
      delete assessment['client-notes'];

      if (client.id) {
        // no op right now
      } else {
        const clientKey = clientsRef
          .child(`/${trainerId}/`)
          .push(client)
          .key;

        assessmentsRef
          .child(`/${trainerId}/${clientKey}/`)
          .push(assessment, done);
      }
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
      app.firebase.auth.onAuthStateChanged(app.onAuthStateChanged);

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
