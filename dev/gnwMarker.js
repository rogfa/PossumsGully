/*
* Google Map marker handler, placing the specified marker as long as there
* is water depth (-ve elevation) at that location, otherwise...
*
* To avoid calling the google Elevation service over and over (and so rack up
* costs) each new call is also saved on the firebase database and any
* subsequent reqest to place a marker will first try the saved copies.
*
* Note that the google elevator service is asynchronous, so we can't simply
* return a found elevation to the calling function(s). Instead the required
* operations are performed here ie move a google map marker if it is in the
* sea, otherwise....
*/

'use strict'

const gnwMarker = function() {
  console.log('gnwMarker init');

  let gElevKnown = {}; // global list of known elevations
  const gPrec = 1000; // precision of saved lat/lng (ie size of rectangle)
  const gElevGround = 4; // assume anything reported by google above 4m is ground
  let gShowingKnown = false;
  let gRegister = []; // register (list) of markers on map

  // define the icons of markers that can be created, in a list that is searched
  // by the 'create' function
  const gNameSpaceSVG = 'http://www.w3.org/2000/svg';
  const gTriremeSVG = "M 10 0 q 5 5 2 20 h -4 q -3 -15 2 -20 z"; // ship outline
  const gSurvivorSVG = [["path","M 0,80 q 15,10 30,0 t 30,0 30,0", "none"],
                     ["path", "M 10,53 q 20 -12 40 -10  z", "black"],
                     ["path", "M 30,70 q -2 8 -10 5 q -5 -5 -10 -20 q 4 -5 8 1 z", "black"],
                     ["circle", null, "black", 45, 70, 10]]; // survivor waving for help

  const gMarkerIcons = [
   ['ship', {url: "https://game-icons.net/icons/000000/transparent/1x1/delapouite/trireme.png",
             scaledSize: new google.maps.Size(25, 25)}]
                      ];



  // Google geocoder to allow lookup of location detail given a lat/lng
  const googleElevator = new google.maps.ElevationService();

  // Firebase listeners to keep the global list of known elevations up to date
  // as new entries are added to the database (by anyone)
  dbRootRef.child('GNW').child('Locations').on('child_added', snapLats => {
    snapLats.forEach(snapLngs => {
      gElevKnown[snapLats.key] = gElevKnown[snapLats.key] || {};
      snapLngs.forEach(snapAttr => {
        gElevKnown[snapLats.key][snapLngs.key] = {elev: snapAttr.val()};
      });
    });
  });

  setupTriremeSVGs();

  // Creates an SVG image of a trireme being rotated around the
  // points of the compass.. these are later used for map markers
  function setupTriremeSVGs() {
    const elDemo = document.getElementById('demoSVG');
    const compassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    for (let i=0; i<compassPoints.length; i++) {
      elDemo.appendChild( rotateAndCreateSVG('trireme' + i, gTriremeSVG, i* 45) );
    }

    const elSurv = document.createElementNS(gNameSpaceSVG, 'svg');
    elSurv.setAttributeNS(null, "viewBox", "0 0 100 100");
    elSurv.setAttributeNS(null, "width", 100);
    elSurv.setAttributeNS(null, "height", 100);
    for (let i=0; i<gSurvivorSVG.length; i++) {
      const elPath = document.createElementNS(gNameSpaceSVG, gSurvivorSVG[i][0]);
      if (gSurvivorSVG[i][1] != null) {elPath.setAttributeNS(null, 'd', gSurvivorSVG[i][1]);}
      if (gSurvivorSVG[i][3] != null) {elPath.setAttributeNS(null, 'cx', gSurvivorSVG[i][3]);}
      if (gSurvivorSVG[i][4] != null) {elPath.setAttributeNS(null, 'cy', gSurvivorSVG[i][4]);}
      if (gSurvivorSVG[i][5] != null) {elPath.setAttributeNS(null, 'r', gSurvivorSVG[i][5]);}
      elPath.setAttributeNS(null, 'fill', gSurvivorSVG[i][2]);
      elPath.setAttributeNS(null, 'stroke', 'black');
      elSurv.appendChild(elPath);
    }
    elDemo.appendChild( elSurv );
  }

  // returns the SVG path statement for a trireme facing the given direction
  function getTriremeSVG(compassPoint) {
    const svgTrireme = document.getElementById('trireme' + compassPoint);
    return svgTrireme.innerHTML;
  }

  function rotateAndCreateSVG(id, svgPathd, degrees) {
    const elSVG = document.createElementNS(gNameSpaceSVG, 'svg');
    elSVG.id = id;
    elSVG.setAttributeNS(null, "viewBox", "0 0 20 20");
    elSVG.setAttributeNS(null, "width", 20);
    elSVG.setAttributeNS(null, "height", 20);

    const elPath = document.createElementNS(gNameSpaceSVG, 'path');
    elPath.setAttributeNS(null, 'd', svgPathd);
    elPath.setAttributeNS(null, 'transform', 'rotate(' + degrees + ', 10, 10)');
    elSVG.appendChild(elPath);
    return elSVG;
  }

  /*
  * Creates and returns a google map marker of the indicated type eg
  * trireme, bireme... or a standard marker if no type is specified
  */
  function create(type, title, heading=null, colour='black', opacity=0.8) {
    if (type == 'trireme' && heading != null) {
      const svgIcon = {path: gTriremeSVG, rotation: heading, strokeWeight: 0,
                       fillColor: colour, fillOpacity: opacity,
                       anchor: new google.maps.Point(10, 10)};
      const marker = new google.maps.Marker({icon: svgIcon, title: title});

      return marker;
    }

    if (type == 'swim' && heading != null) {
      const svgIcon = {path: gSurvivorSVG[0][1], rotation: heading, strokeWeight: 0,
                       fillColor: colour, fillOpacity: opacity,
                       scaledSize: new google.maps.Size(25, 25),
                       anchor: new google.maps.Point(10, 10)};
      const marker = new google.maps.Marker({icon: svgIcon, title: title});

      return marker;
    }

    // not a trireme, so check for other defined types
    for (let i=0; i<gMarkerIcons.length; i++) {
      if (gMarkerIcons[i][0] == type) {
        return new google.maps.Marker({icon: gMarkerIcons[i][1], title: title});
      }
    }

    // not one of those either, so return a generic marker
    return new google.maps.Marker({title: title});
  }

  function addClickCallback(shipId, callbackFunction) {
    for (let i=0; i<gRegister.length; i++) {
      const marker = gRegister[i];
      if (marker.shipId == shipId) {
        marker.addListener("click", () => {callbackFunction(shipId);});
        break;
      }
    }
  }

  /*
  * Changes heading of a ship by adjusting the SVG image rotation in the marker
  * and the location by adjusting the marker's location
  */
  function newLocation(shipId, heading, location) {
    // find marker in the register
    for (let i=0; i<gRegister.length; i++) {
      const marker = gRegister[i];
      if (marker.shipId == shipId) {
        // get & rotate the icon then replace it in the marker
        const icon = marker.getIcon();
        icon.rotation = heading;
        marker.setIcon(icon);
        // set the location of the marker
        marker.setPosition( location )
        break;
      }
    }
  }

  function changeIcon(shipId, type) {
    console.log('changIcon', shipId);
    for (let i=0; i<gRegister.length; i++) {
      const marker = gRegister[i];
      if (marker.shipId == shipId) {
        const icon = marker.getIcon();
        icon.path = "https://commons.wikimedia.org/wiki/File:Open_water_swimming_pictogram.svg";
        marker.setIcon(icon);
      }
    }
  }

  /*
  * Animate a ship marker to bring attention to it
  */
  function highlight(shipId) {
    for (let i=0; i<gRegister.length; i++) {
      const marker = gRegister[i];
      if (marker.shipId == shipId) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout( function() {marker.setAnimation(null), 1000})
        break;
      }
    }
  }

  /*
  * Adds the given marker to the list of markers on the map
  */
  function register(marker, map) {
    marker.setMap(map);
    gRegister.push(marker);
  }

  /*
  * Removes all registered markers from the map and resets the register
  */
  function removeAll() {
    for (let i=0; i<gRegister.length; i++) {
      gRegister[i].setMap(null);
    }
    gRegister = [];
  }

  /*
  * places the given google map marker at the given location - a google LatLng
  * object.  Assumes that the marker is already on a map.
  * @param {google.map.Marker} marker
  * @param {google.map.LatLng} location
  * @param {google.map.Map} map
  * @param {function} callback
  */
  function place(marker, location, map, callback=null) {
    marker.attemptedPosition = location; // record attempted placement lat,lng

    // See if this location is already known, if so use the known elevation.
    // First, convert each to to 4 dec place, giving around 36'length.
    const keyLat = parseInt(location.lat()*gPrec);
    const keyLng = parseInt(location.lng()*gPrec);
    if (gElevKnown[keyLat] != null) {
      if (gElevKnown[keyLat][keyLng] != null) {
        const elev = gElevKnown[keyLat][keyLng].elev;
        if (elev <= gElevGround) {
          marker.setPosition( location );
        };
        if (callback != null) {callback(marker);}
        return;
      }
    }

    // Not known, look it up from the google elevation service, save the
    // result and use the looked-up elevation.
    googleElevator.getElevationForLocations( {locations: [location]},
      function(googResults, googStatus) {
        if (googStatus == 'OK') {
          const elev = googResults[0].elevation;
          dbRootRef.child('GNW').child('Locations').child(keyLat).child(keyLng).update({elev: elev});
          if (gShowingKnown) {placeRectangle(keyLat, keyLng, elev, map);}

          // if the location is on the water, move marker to that location and
          // if one was supplied, call the callback function so that the
          // placement can be processed.
          if (elev <= gElevGround) {
            marker.setPosition( location );
          };
          if (callback != null) {callback(marker);}
        }
      });
  }

  /**
  * scales a marker relative to the zoom level of the map, so ship icons kinda
  * represent the size of the ships, becoming dots as you zoom out TODO
  */
  function scale(marker) {
    //https://stackoverflow.com/questions/3281524/resize-markers-depending-on-zoom-google-maps-v3
  }

  /*
  * Places a colour coded rectangle on the map to indicate the areas that have
  * already had their elevation returned by Google and saved on the database.
  */
  function showKnown(map) {
    if (gShowingKnown) {return;} // dont duplicate
    for (let keyLat in gElevKnown) {
      for (let keyLng in gElevKnown[keyLat]) {
        placeRectangle(keyLat, keyLng, gElevKnown[keyLat][keyLng].elev, map);
      }
    }
    gShowingKnown = true;
  }

  function placeRectangle(keyLat, keyLng, elev, map) {
    try {
      const n = keyLat / gPrec;
      const s = n + 1/gPrec;
      const w = keyLng / gPrec;
      const e = w + 1/gPrec;
      let fillColor = "Brown"; //"#FF0000"
      if (elev <= gElevGround) {fillColor = "Aqua";}
      if (elev < -10) {fillColor = "MediumBlue";}
      if (elev < -100) {fillColor = "DarkBlue";}
      const rectangle = new google.maps.Rectangle({clickable: false,
       fillColor: fillColor, fillOpacity: 0.3, strokeOpacity: 0,
       map, bounds: {north: n, south: s, east: e, west: w}
      });
    } catch (err) {
      console.error('place known ' + keyLat + keyLng + ' ' + err);
    }
  }

  //-----------------------------------------------------------
  // expose wrapped functions that get called from the HTML
  return {addClickCallback: addClickCallback,
          changeIcon: changeIcon,
          create: create,
          highlight: highlight,
          newLocation: newLocation,
          place: place,
          register: register,
          removeAll: removeAll,
          showKnown: showKnown}
} (); // // end and immediately execute the ananymous wrapper
