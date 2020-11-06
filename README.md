# PossumsGully
Simple booking system for a property with checklist of things to-do on arrival and departure plus a guest book.

Styling is based on w3schools w3.css and is responsive... but is really intended for use on a phone.

Using 
- CSS to convert a list to a calendar display;
- firebase auth for user security, with anyone allowed to join
- firebase realtime database for storing bookings, checklists and guest book entries

Note that the firebase API key is kept in a file (firebase-init.js) that is NOT included in the repository so that the API key is not publically available. Code is:
```
"use strict";
let /** string */ dbRootRef = null; // reference to the root node
let /** string */ dbSiteRef = null; // reference to this selected site

( function() {
  // Firebase configuration ie the possums-gully app, db, etc
  let firebaseConfig = {
    apiKey: "XXXXXXXXXXXXXX",
    authDomain: "XXXXXXXXXX",
    databaseURL: "XXXXXXXXXXXX",
    projectId: "XXXXXXXXXX",
    storageBucket: "XXXXXXXXXXXXX",
    messagingSenderId: "XXXXXXXXX",
    appId: "XXXXXXXXXXXXXXXXXXXX",
    measurementId: "XXXXX"
  };

  // Initialise firebase
  let app = firebase.initializeApp(firebaseConfig);

  // make reference to the Firebase JSON data
  let /** object */ dbase = app.database();
  dbRootRef = dbase.ref();

  // keep track of connection status and show a disconnection alert if such
  // exists on this page.
  const connectedRef = dbase.ref(".info/connected");
  const alertDisc = document.getElementById('alertDisconnected');
  if (alertDisc != null) {
    connectedRef.on("value", function(snap) {
      if (snap.val() === true) {
        alertDisc.style="display:none";
      } else {
        alertDisc.style="display:block";
      }
    });
  }

} () );
```
