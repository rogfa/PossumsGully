/*
* AI routines to manage squadrons not controlled by a human player
*/

'use strict'

const gnwAI = function() {
  console.log('gnwAI init');
  let gRuler = null; // a Cheap Ruler, set for each battle site
  let gPosList = null;

  /*
  * Deploys any undeployed ships in AI squadrons for this battle.
  * Works through the ships and updates the database with deployment decisions.
  */
  function deploy(battleId, battleMap = null) {
    // Asynch read of all squadrons in this battle to find undeployed ships, but
    // first get the battle details as it gets used during deployment, build
    // a distance calculaator (CheapRuler) calibrated for this battle's
    // latitude and get a current list of the locaiton of all ships already
    // deployed.
    dbRootRef.child('GNW').child('Battles').child(battleId).once('value', snapBattle => {
      // build a fast geocalculator for this battles latitude, reset ship posn list
      gRuler = new CheapRuler(snapBattle.val().site.lat, 'metres');
      gPosList = [[], [], []]; // one list for each side

      // get all currently deployed ships...
      dbRootRef.child('GNW')
               .child('Ships')
               .orderByChild('battleId')
               .equalTo(battleId).once('value', snapDeployedShips => {

        // build a list of the location of each deployed ship on each side
        snapDeployedShips.forEach(snapDeployedShip => {
          const deployedSquad = snapDeployedShip.val().squadron;
          const deployedSide = snapBattle.child('Squadrons').child(deployedSquad).val().side;
          gPosList[deployedSide].push(snapDeployedShip.val().location);
        });

        // now, loop through each squadron in the battle. For each AI controlled
        // squadron get the current list of ships and try to deploy each one
        // that is not yet deployed
        snapBattle.child('Squadrons').forEach(snapBattleSquad => {
          if (snapBattleSquad.val().player == 'AI') {

            dbRootRef.child('GNW')
                     .child('Ships')
                     .orderByChild('squadron')
                     .equalTo(snapBattleSquad.key)
                     .once('value', snapShips => {
              snapShips.forEach(snapShip => {
                if (snapShip.val().battleId == null) {
                  deployShip(snapShip, snapBattle, battleMap);
                }
              });
            });

          }
        });

      }); // end of asynch getting all currently deployed ships
    }); // end of asynch get battle
  }

  /*
  * Place the given ship on the map ready for the given battle. Approach is
  * - place near other ships from same side, if there are any already deployed,
  *   and try and place in line abreast formation with existing ship(s);
  * - place in upwind position if this is the first ship.
  * In all cases, hunt around to avoid placing on land.
  */
  function deployShip(snapMyShip, snapBattle, battleMap) {
    const mySquad = snapMyShip.val().squadron;
    const mySide = snapBattle.child('Squadrons').child(mySquad).val().side;
    const battleId = snapBattle.key;

    // determine the wind heading, in degrees and initialise a marker that will
    // be used to carry information to/from the gnwMarker placement function.
    // Note that initial ship heading is downwind.
    let upwDegrees = snapBattle.val().wind.direction * 45; // convert cardinal point to degrees
    const image = "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png";
    const shipMarker = new google.maps.Marker({icon: image,
                                               title: snapMyShip.val().name,
                                               gnw: {battleId: battleId,
                                                     shipId: snapMyShip.key,
                                                     shipNm: snapMyShip.val().name,
                                                     heading: (upwDegrees + 180) % 360,
                                                     attemptNo: 1,
                                                     sideNo: mySide}
                                             });

    // Determine the preferred placement as either abreast existing ships or
    // upwind of the battle point. Add this preferred posiiton to the list so
    // that the next ship will start abreast of this, even if both have to be
    // moved to avoid land. Then call the asynch marker placement function to
    // check whether this psoition is at sea or on land, with results handled
    // by a callback function.
    if (gPosList[mySide].length > 0) { // some already deployed, place abreast
      let abrDegrees = (upwDegrees + 90) % 360;
      if (abrDegrees == 0) {abrDegrees = 5;} // so always go eastward
      if (abrDegrees == 180) {abrDegrees = 175;} // so always go eastward
      if (abrDegrees > 180) {abrDegrees = (abrDegrees + 180) % 360;} // so always go eastward

      // locate posn of ship furthest to the east in the line
      let furthest = 0;
      for (let i=1; i<gPosList[mySide].length; i++) {
        if (gPosList[mySide][i].lng > gPosList[mySide][furthest].lng) {furthest = i;}
      }

      // place this ship further, orthogonally to the direction of the wind
      const furthestPoint = [gPosList[mySide][furthest].lng, gPosList[mySide][furthest].lat];
      const nextPoint = gRuler.destination(furthestPoint, 30, abrDegrees);
      const nextLL = {lat: nextPoint[1], lng: nextPoint[0]};
      flagIt(snapMyShip.val().name, battleMap, nextLL, 'B');
      console.log('AI abreast', snapMyShip.val().name, abrDegrees);

      gPosList[mySide].push(nextLL); // list this preferred location as occupied
      const gLL = new google.maps.LatLng(nextLL);
      gnwMarker.place(shipMarker, gLL, battleMap, deployShipResult);


    } else { // none yet deployed, place upwind
      const battlePoint = [snapBattle.val().site.lng, snapBattle.val().site.lat];
      const upwPoint = gRuler.destination(battlePoint, 2000, upwDegrees);
      const upwLL = {lat: upwPoint[1], lng: upwPoint[0]};
      flagIt(snapMyShip.val().name, battleMap, upwLL, 'A');
      console.log('AI upwind', snapMyShip.val().name, upwDegrees);

      gPosList[mySide].push(upwLL); // list this preferred location as occupied
      const gLL = new google.maps.LatLng(upwLL);
      gnwMarker.place(shipMarker, gLL, battleMap, deployShipResult);
    }


  }


  // Reacts to the result of the marker placement attempt. It could be
  // - a fail as the place was on ground, in which case another attempt will
  //   be made; or
  // - a success, in which case the ship's database record is updated.
  function deployShipResult(marker) {
    const shipId = marker.gnw.shipId;
    const heading = marker.gnw.heading;
    const shipNm = marker.gnw.shipNm;
    const shipSide = marker.gnw.sideNo;

    if (marker.position == null) { // not placed, try again
      marker.gnw.attemptNo++;

      if (marker.gnw.attemptNo > 20) { // too many, don't want an infinite loop

      } else { // creep a bit closer to the battle point and try again
        const lastPoint = [marker.attemptedPosition.lng(), marker.attemptedPosition.lat()];
        const nextPoint = gRuler.destination(lastPoint, 100, heading);
        const nextLL = {lat: nextPoint[1], lng: nextPoint[0]};

        console.log('AI creep', marker.gnw.attemptNo - 1, shipNm, heading, nextPoint[1]);

        gPosList[shipSide].push(nextLL); // list this next location as occupied
        const gLL = new google.maps.LatLng(nextLL);
        gnwMarker.place(marker, gLL, null, deployShipResult);
      }


    } else { // placement succeeded, update database entry for the ship
      const battleId = marker.gnw.battleId;
      const llSet = marker.getPosition();
      const llSimple = {lat: llSet.lat(), lng: llSet.lng()};
      gPosList[shipSide].push(llSimple); // list this final location as occupied
      const cmd = {battleId: battleId, location: llSimple, heading: heading};
      console.log('AI deploy', shipNm, llSimple, heading);
      dbRootRef.child('GNW').child('Ships').child(shipId).update(cmd);
    }

  }

  function flagIt(shName, battleMap, ll, label) {
    if (battleMap == null) {return;}

    const image = "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png";
    const flag = new google.maps.Marker({icon: image, title: shName, label:label});
    flag.setMap(battleMap);
    flag.setPosition(ll);
  }

  //-----------------------------------------------------------
  // expose wrapped functions that get called from the HTML
  return {deploy: deploy}
} (); // // end and immediately execute the ananymous wrapper
