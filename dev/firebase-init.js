/**
 * @file The data for this app is stored in the firebase's realtime cloud
 * database. This script intialises the database connection and sets up
 * some global variables for accessing that database.
 * Part of the possums gully web application.
 *
 * The firebaseUI facility is used to manage users and authorisation.
 * Use the firebase console to manage database settings
 * @author Rod Hawkes
 */
"use strict";
let /** string */ dbRootRef = null; // reference to the root node
let /** string */ dbSiteRef = null; // reference to this selected site

( function() {
  // Firebase configuration ie the possums-gully app, db, etc
  let firebaseConfig = {
    apiKey: "AIzaSyDLRUzK96UMRRNTMIStMZG0_KNrDxGpb90",
    authDomain: "possums-gully.firebaseapp.com",
    databaseURL: "https://possums-gully.firebaseio.com",
    projectId: "possums-gully",
    storageBucket: "possums-gully.appspot.com",
    messagingSenderId: "340660838409",
    appId: "1:340660838409:web:a9b9c34c75059a7ea9d8d8",
    measurementId: "G-S91NBC8991"
  };

  // Initialise firebase
  let app = firebase.initializeApp(firebaseConfig);

  // make reference to the Firebase JSON data
  let /** object */ dbase = app.database();
  dbRootRef = dbase.ref();
  console.log(dbRootRef.toString());

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
