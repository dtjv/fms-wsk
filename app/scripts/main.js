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
  (function() {
    'use strict';

    const ON = 'on';
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
    // hack!
    //
    // when site is served from dist build, the 'type=text' attr for
    // client first name and last name fields go missing. this causes these two
    // fields to not be selected by Materialize when `updateTextFields()` is
    // called.
    //
    // -------------------------------------------------------------------------
    $('#first-name-edit').attr('type', 'text');
    $('#last-name-edit').attr('type', 'text');

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

      // required field
      if (!fields['client-first-name']) {
        return Materialize
          .toast('Please provide client\'s first name.', 2000, '', () => {
            $('#first-name-edit').focus();
          });
      }

      // required field
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
      const clientId = $target.data('client-id');

      if (clientId && app.clients[clientId]) {
        app.showClientDetailView(clientId);
      } else {
        console.error(`Cannot find client id - ${clientId} in app.clients`);
      }
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
        route: '/',
      }, 'FMS', '/');
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
      $('#ds-score').text('');
      $('#hs-score').text('');
      $('#il-score').text('');
      $('#sm-score').text('');
      $('#sct-score').text('');
      $('#aslr-score').text('');
      $('#tsp-score').text('');
      $('#ect-score').text('');
      $('#rs-score').text('');
      $('#fct-score').text('');

      if (clientId) {
        app.buildEditAssessmentView(clientId);
      } else {
        $('select').material_select();
        Materialize.updateTextFields();
      }

      app.toggleViewOn(app.views.$editAssessment);
      window.history.pushState({
        route: '/edit',
      }, 'FMS', '/edit');
    };

    app.showClientDetailView = function(clientId) {
      app.buildClientDetailView(clientId);
      app.toggleViewOn(app.views.$clientDetail);
      window.history.pushState({
        route: '/detail',
      }, 'FMS', '/detail');
    };

    app.buildClientListView = function(clients = {}) {
      const $clientList = app.views.$clientList.find('.row');

      $clientList.find('.clone').remove();

      Object.entries(clients)
        .map(([id, client]) => {
          const $clone = $('.client-template').clone(true);
          $clone
            .removeClass('client-template hide');
          $clone
            .addClass('clone');
          $clone
            .find('.client-name')
            .text(`${client.firstName} ${client.lastName}`);
          $clone
            .find('.card-panel')
            .data('client-id', id);
          return $clone;
        })
        .forEach(($client) => {
          $clientList.append($client);
        });
    };

    app.buildClientDetailView = function(clientId) {
      const populateClient = function(clientId, assessmentId, client) {
        const $el = app.views.$clientDetail.find('#client-read');
        $el
          .data('client-id', clientId);
        $el
          .data('assessment-id', assessmentId);
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

      const populateDS = function($el, screens) {
        $el
          .find('#ds-score-read')
          .text(`${screens['ds-score']}`);
        $el
          .find('#ds-notes-read')
          .text(`${screens['ds-notes']}`);
      };

      const populateHS = function($el, screens) {
        $el
          .find('#hs-score-read')
          .text(`${screens['hs-score']}`);
        $el
          .find('#hs-notes-read')
          .text(`${screens['hs-notes']}`);
        $el
          .find('#hs-raw-score-left-read')
          .text(`${screens['hs-raw-score-left'] || ''}`);
        $el
          .find('#hs-raw-score-right-read')
          .text(`${screens['hs-raw-score-right'] || ''}`);
      };

      const populateIL = function($el, screens) {
        $el
          .find('#il-score-read')
          .text(`${screens['il-score']}`);
        $el
          .find('#il-notes-read')
          .text(`${screens['il-notes']}`);
        $el
          .find('#il-raw-score-left-read')
          .text(`${screens['il-raw-score-left'] || ''}`);
        $el
          .find('#il-raw-score-right-read')
          .text(`${screens['il-raw-score-right'] || ''}`);
      };

      const populateSM = function($el, screens) {
        $el
          .find('#sm-score-read')
          .text(`${screens['sm-score']}`);
        $el
          .find('#sm-notes-read')
          .text(`${screens['sm-notes']}`);
        $el
          .find('#sm-raw-score-left-read')
          .text(`${screens['sm-raw-score-left'] || ''}`);
        $el
          .find('#sm-raw-score-right-read')
          .text(`${screens['sm-raw-score-right'] || ''}`);
      };

      const populateSCT = function($el, screens) {
        $el
          .find('#sct-score-read')
          .text(`${screens['sct-score'] === PLUS ? ICON_PLUS : ICON_MINUS}`);
        $el
          .find('#sct-notes-read')
          .text(`${screens['sct-notes']}`);
        $el
          .find('#sct-raw-score-left-read')
          .text(`
            ${screens['sct-raw-score-left'] === ON ? ICON_PLUS : ICON_MINUS}
          `);
        $el
          .find('#sct-raw-score-right-read')
          .text(`
            ${screens['sct-raw-score-right'] === ON ? ICON_PLUS : ICON_MINUS}
          `);
      };

      const populateASLR = function($el, screens) {
        $el
          .find('#aslr-score-read')
          .text(`${screens['aslr-score']}`);
        $el
          .find('#aslr-notes-read')
          .text(`${screens['aslr-notes']}`);
        $el
          .find('#aslr-raw-score-left-read')
          .text(`${screens['aslr-raw-score-left'] || ''}`);
        $el
          .find('#aslr-raw-score-right-read')
          .text(`${screens['aslr-raw-score-right'] || ''}`);
      };

      const populateTSP = function($el, screens) {
        $el
          .find('#tsp-score-read')
          .text(`${screens['tsp-score']}`);
        $el
          .find('#tsp-notes-read')
          .text(`${screens['tsp-notes']}`);
      };

      const populateECT = function($el, screens) {
        $el
          .find('#ect-score-read')
          .text(`
            ${screens['ect-score'] === PLUS ? ICON_PLUS : ICON_MINUS}
          `);
        $el
          .find('#ect-notes-read')
          .text(`${screens['ect-notes']}`);
      };

      const populateRS = function($el, screens) {
        $el
          .find('#rs-score-read')
          .text(`${screens['rs-score']}`);
        $el
          .find('#rs-notes-read')
          .text(`${screens['rs-notes']}`);
        $el
          .find('#rs-raw-score-left-read')
          .text(`${screens['rs-raw-score-left'] || ''}`);
        $el
          .find('#rs-raw-score-right-read')
          .text(`${screens['rs-raw-score-right'] || ''}`);
      };

      const populateFCT = function($el, screens) {
        $el
          .find('#fct-score-read')
          .text(`
            ${screens['fct-score'] === PLUS ? ICON_PLUS : ICON_MINUS}
          `);
        $el
          .find('#fct-notes-read')
          .text(`${screens['fct-notes']}`);
      };

      const trainerId = app.firebase.auth.currentUser.uid;

      app
        .firebase
        .db
        .ref(`/assessments/${trainerId}/${clientId}/`)
        .once('value', function(snapshot) {
          // `snapshot` is actually all assessments for this selected client
          const [assessmentId, screens] = Object.entries(snapshot.val())[0];

          populateClient(clientId, assessmentId, app.clients[clientId]);

          app
            .views
            .$clientDetail
            .find('.screen')
            .each(function(index, screen) {
              const $screen = $(screen);

              switch ($screen.attr('id')) {
                case 'ds-read':
                  return populateDS($screen, screens);
                case 'hs-read':
                  return populateHS($screen, screens);
                case 'il-read':
                  return populateIL($screen, screens);
                case 'sm-read':
                  return populateSM($screen, screens);
                case 'sct-read':
                  return populateSCT($screen, screens);
                case 'aslr-read':
                  return populateASLR($screen, screens);
                case 'tsp-read':
                  return populateTSP($screen, screens);
                case 'ect-read':
                  return populateECT($screen, screens);
                case 'rs-read':
                  return populateRS($screen, screens);
                case 'fct-read':
                  return populateFCT($screen, screens);
                default:
                  return undefined;
              }
            });
      });
    };

    app.buildEditAssessmentView = function(clientId) {
      const trainerId = app.firebase.auth.currentUser.uid;

      app
        .firebase
        .db
        .ref(`/assessments/${trainerId}/${clientId}/`)
        .once('value', function(snapshot) {
          // `snapshot` is actually all assessments for this selected client
          const [assessmentId, screens] = Object.entries(snapshot.val())[0];
          const client = app.clients[clientId];

          $('#client-id-edit').val(clientId);
          $('#assessment-id-edit').val(assessmentId);

          $('#first-name-edit').val(client.firstName);
          $('#last-name-edit').val(client.lastName);
          $('#client-notes-edit').val(client.notes);

          $('#ds-raw-score-edit').val(screens['ds-raw-score']);
          $('#ds-score-edit').val(screens['ds-score']);
          $('#ds-score').text(screens['ds-score']);
          $('#ds-notes-edit').val(screens['ds-notes']);

          $('#hs-raw-score-left-edit').val(screens['hs-raw-score-left']);
          $('#hs-raw-score-right-edit').val(screens['hs-raw-score-right']);
          $('#hs-score-edit').val(screens['hs-score']);
          $('#hs-score').text(screens['hs-score']);
          $('#hs-notes-edit').val(screens['hs-notes']);

          $('#il-raw-score-left-edit').val(screens['il-raw-score-left']);
          $('#il-raw-score-right-edit').val(screens['il-raw-score-right']);
          $('#il-score-edit').val(screens['il-score']);
          $('#il-score').text(screens['il-score']);
          $('#il-notes-edit').val(screens['il-notes']);

          $('#sm-raw-score-left-edit').val(screens['sm-raw-score-left']);
          $('#sm-raw-score-right-edit').val(screens['sm-raw-score-right']);
          $('#sm-score-edit').val(screens['sm-score']);
          $('#sm-score').text(screens['sm-score']);
          $('#sm-notes-edit').val(screens['sm-notes']);

          if (screens['sct-raw-score-left'] === ON) {
            $('#sct-raw-score-left-edit input').prop('checked', true);
          }

          if (screens['sct-raw-score-right'] === ON) {
            $('#sct-raw-score-right-edit input').prop('checked', true);
          }

          $('#sct-score-edit').val(screens['sct-score']);

          if (screens['sct-score'] === PLUS) {
            $('#sct-score').text(ICON_PLUS);
          } else {
            $('#sct-score').text(ICON_MINUS);
          }

          $('#sct-notes-edit').val(screens['sct-notes']);

          $('#aslr-raw-score-left-edit')
            .val(screens['aslr-raw-score-left']);
          $('#aslr-raw-score-right-edit')
            .val(screens['aslr-raw-score-right']);
          $('#aslr-score-edit').val(screens['aslr-score']);
          $('#aslr-score').text(screens['aslr-score']);
          $('#aslr-notes-edit').val(screens['aslr-notes']);

          $('#tsp-raw-score-edit').val(screens['tsp-raw-score']);
          $('#tsp-score-edit').val(screens['tsp-score']);
          $('#tsp-score').text(screens['tsp-score']);
          $('#tsp-notes-edit').val(screens['tsp-notes']);

          if (screens['ect-raw-score'] === ON) {
            $('#ect-raw-score-edit input').prop('checked', true);
          }

          $('#ect-score-edit').val(screens['ect-score']);

          if (screens['ect-score'] === PLUS) {
            $('#ect-score').text(ICON_PLUS);
          } else {
            $('#ect-score').text(ICON_MINUS);
          }

          $('#fct-notes-edit').val(screens['fct-notes']);

          $('#rs-raw-score-left-edit').val(screens['rs-raw-score-left']);
          $('#rs-raw-score-right-edit').val(screens['rs-raw-score-right']);
          $('#rs-score-edit').val(screens['rs-score']);
          $('#rs-score').text(screens['rs-score']);
          $('#rs-notes-edit').val(screens['rs-notes']);

          if (screens['fct-raw-score'] === ON) {
            $('#fct-raw-score-edit input').prop('checked', true);
          }

          $('#fct-score-edit').val(screens['fct-score']);

          if (screens['fct-score'] === PLUS) {
            $('#fct-score').text(ICON_PLUS);
          } else {
            $('#fct-score').text(ICON_MINUS);
          }

          $('#fct-notes-edit').val(screens['fct-notes']);

          $('select').material_select();
          Materialize.updateTextFields();
        });
    };

    app.calculateFinalScore = function(fields) {
      let score = 0;

      if (fields['sct-score'] === MINUS &&
          fields['ect-score'] === MINUS &&
          fields['fct-score'] === MINUS) {
        score += Number(fields['ds-score']);
        score += Number(fields['hs-score']);
        score += Number(fields['il-score']);
        score += Number(fields['sm-score']);
        score += Number(fields['aslr-score']);
        score += Number(fields['tsp-score']);
        score += Number(fields['rs-score']);
      }

      return score.toString();
    };

    app.saveAssessment = function(fields, done) {
      const trainerId = app.firebase.auth.currentUser.uid;
      const clientId = fields['client-id'];
      const assessmentId = fields['assessment-id'];
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
      delete assessment['client-id'];
      delete assessment['assessment-id'];

      if (clientId) {
        const updates = {};
        updates[`/clients/${trainerId}/${clientId}/`] = client;
        updates[`/assessments/${trainerId}/${clientId}/${assessmentId}/`] =
          assessment;
        app.firebase.db.ref().update(updates).then(done);
      } else {
        const clientsRef = app.firebase.db.ref('clients');
        const assessmentsRef = app.firebase.db.ref('assessments');

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
    app.startup();
  })();
})();
