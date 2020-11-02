/**
 * @file Check whether user is logged on, if so place their name on the page
 * header and get their company. Otherwise, redirect to the sign-on page.
 * Part of the possums-gully web application.
 *
 * The firebaseUI facility is used to manage users and authorisation.
 * Use the firebase console to manage authorisation settings
 * @author Rod Hawkes
 */
"use strict";

/**
 * Whenever firebase notifies that the authorisation status has changed...
 */
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {  // User is signed in.
    console.log('user auth state changed event START');

    // check for session time-out... not built-into Firebase Auth so make check
    // here by fetching the decoded ID token and create a session timeout which
    // signs the user out.
    //user.getIdTokenResult().then((idTokenResult) => {
      // Make sure all the times are in milliseconds!
      //const /** number */ authTime = idTokenResult.claims.auth_time; // in sec.s
      //const /** number */ duration = Date.now() - authTime * 1000; // in msec
      //const /** number */ limit = 10 * 60 * 60 * 1000; // 8hrs in milliseconds
      //if (duration > limit) { // if more than session limit....
      //  alert('Your session has expired, please login again.');
      //  authLogoff();
      //} else {
      //  const /** number */ toGo = (limit - duration); // milliseconds left
      //  setTimeout(() => authLogoff(), toGo); // schedule logout incase screen does not change
      //}
    //});

    // If this page has the user name element, update it with the user's
    // full name. Make it red if their email has not been verified.
    if (document.getElementById('userName') != null) {
      document.getElementById('userName').innerText = user.displayName;
      document.getElementById('userName').setAttribute("onclick", "navUserSettings()");
      document.getElementById('userName').style="cursor:pointer";
      document.getElementById('userName').classList.add="w3-dropdown-click";

      // if they have not yet verified their email then make name red
      if (!user.emailVerified) {
        document.getElementById('userName').style = 'color:red';
      }
    }

    // always load the company details, as they sometimes get used eg to
    // calculate distanace from the office to the site.
    dbRootRef.child('Users').child(user.uid).once('value', snapUser => {
      console.log('got user record');
      if (snapUser.val() == null) { // not registered on app database
        // Create record so that company admin can add the new user to their
        // company via the settings page.
        dbRootRef.child('Users').child(user.uid).set({
          name: user.displayName,
        });

        // Send a request to verify their email, if not already verified
        if (!user.emailVerified) {
          user.sendEmailVerification()
              .then(function() {
                alert('A request for you to verify your email address has been '
                + 'sent. Please check your inbox and maybe your SPAM too.');
              })
              .catch(function(err) {
                alert('Verification email could not be sent. '
                + 'Please contact support.');
              });
        }

      } else { // registered, so...

        // trigger the page loading scripts,
        let e = new Event("pgUserAuthorised", {bubbles: true});
        document.dispatchEvent(e);


      } // end registered and accepted user

    });

  } else {
    window.location.replace("auth-page.html");
  }
});
