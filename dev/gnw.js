/**
 * @file holds scripts used in the Greek Naval Warfare page wrapped in an
 * anomymous function with some internal functions exposed (at bottom) to allow
 * access to them from the HTML page. Main sections are:
 * - definition of globals, most have a 'g' prefix
 * - wait for the 'authorised' event and
 *   - set global with ship type definitions for the game ie speed, crew, etc
 *   - establish a rotating display of game information, for viewing
 *   - establish the main firebase listeners, to update the battles table
 * - a bunch of common utility functions to assist with HTML eg get, hide, show
 * - functions to establish & display ship type definitions
 * - functions for the Campaign modals (modalCampPick... + modalCampaign...)
 * - functions for the Manage Squadron modal (modalMngSquad...)
 * - functions for the New Battle modal (modalNew...)
 * - functions for the Battle Setup modal (modalBatle... + modalSquad...)
 * - functions for the Battle Deploy modal (modalBattleDeploy...)
 *
 * Part of the possums gully web application.
 * @author Rod Hawkes
 */
'use strict';
// Wrap everything in an anonymous function so that all function names and
// global variables are kept local to this js and can't be accidently
// overridden by other js code
const gnw = function() {
  // ----------------- GLOBALS SECTION
  let /** object */ gTypes = {}; // global to hold ship type definitions
  let /** Array */ gEras = []; // list of eras, built from ship definitions
  let /** number */ gEraSelected = 0; // era selected for a new game
  let /** Array */ gPlayers = []; // user list, reset when an  era is picked
  let /** object */ gRuler = null; // for the CheapRuler at this battle site
  const gCities = ["Athens", "Carthage", "Cyzicus", "Pergamum", "Persia", "Rhodes", "Rome", "Sparta", "Syracuse"];
  const gCitiesAdj = ["Athenian", "Carthaginian", "Cyzicusian", "Pergamumium", "Persian", "Rhodesian", "Roman", "Spartan", "Syracusian"];
  const gAwaiting = ["players", "squadrons", "deployment", "orders", "nothing aka complete"];
  const gShipState = ["new", "ready", "crippled", "beached", "sunk", "retired"];
  const gWindDirn = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]; // points of compass
  const gWindTitle = [ "calm",         "light air",      "light breeze",  "gentle breeze", "moderate breeze", "fresh breeze", "strong breeze"]; // beaufort scale
  const gWindEffect = [[0, 1, 3, 0, 0], [0, 1, 3, 0, 0], [1, 1, 3, 0, 0], [1, 1, 1, 0, 0], [1, 1, 1, 1, 0],   [1, 0, 1, 1, 0],   [0, 0, 0, 0, 1]];
  const gWindProb = [0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6];
  const gWindForecast = ["dropping", "steady", "freshening"];
  const gWindDescr = ["Sea like a mirror.",
                      "Ripples with appearance of scales are formed, without foam crests.",
                      "Small wavelets still short but more pronounced; crests have a glassy appearance but do not break.",
                      "Large wavelets; crests begin to break; foam of glassy appearance; perhaps scattered white horses.",
                      "Small waves becoming longer; fairly frequent white horses.",
                      "Moderate waves taking a more pronounced long form; many white horses are formed; chance of some spray.",
                      "Large waves begin to form; the white foam crests are more extensive everywhere; probably some spray."
                     ];
  const gIntroList = ["Greek Naval Warfare", "Introduction", "Ships"];
  const gIntroDescr = [`<img src="https://game-icons.net/icons/000000/transparent/1x1/delapouite/trireme.png" width="100%">
                       A web browser, multi-player, turn-based boardgame.`,

                       `Based on the rules by Ed Smith and the London Wargames Society,
                       this game is set in the 800BC-0BC years and the ships & cities
                       of those eras. It allows players to
                       <li>create a campaign or play in an existing one;
                       <li>'build' squadrons of ships for a city;
                       <li>start a battle, picking the era and location;
                       <li>join a battle, adding squadrons to the sides;
                       <li>deploy and then command the ships in their squadrons.
                       <p>It is multi-player i.e. many people can participate
                       at the same time and changes made by one person on
                       their screen will be reflected straight away on the web
                       page of any other person viewing that information. Particularly,
                       the health and location of ships in a battle are changed
                       on all pages viewing that battle.`,

                      "<p class='w3-animate-zoom w3-xxlarge'>The Ships..."];
  const gRulesList = ["Concepts", "Campaigns", "Squadrons", "Starting a Battle",
                      "Joining a Battle", "Ship Health", "Ship Crew", "Ship Crew (cont)",
                      "The Battle", "Orders", "Survivors", "Weather"];
  const gRulesDescr = ["<p class='w3-animate-zoom w3-xxlarge'>How to play...",
                       `All cities, squadrons, ships and battles are within
                        a campaign. The game can have several campaigns underway
                        but you will be operating in only one at a time.
                        <p>When you first join you will be prompted to pick a campaign.
                        You can change campaigns or start a new one by clicking the
                        &Delta; button at the bottom of the main page.`,

                       `Active squadrons in a campaign are listed on the left.
                        Click the <i class="fa fa-plus"></i> button to start and manage your
                        own new squadron or the <i class="fa fa-anchor"></i> button to manage
                        an existing squadron.
                        <p>The Manage Squadron pop-up allows you to:
                        <li>select a home city for new squadrons,
                        <li>have the city build a new ship,
                        <li>click <i class="fa fa-arrow-right"></i> to have a city ship join the squadron,
                        <li>click <i class="fa fa-arrow-left"></i> to make a ship leave the squadron, and
                        <li>click <i class="fa fa-flag-o"></i> to move your flag to one ship.
                        <br><span class="w3-tiny">Note that each squadron should have a flagship.</span>
                        <p>Each new ship is given a name that was known to be used
                        in ancient times. If you don't like it, bin that ship and build another.
                        <p>Once a squadron has one or more ships, it is ready to join in battle!`,

                       `Battles are conducted on a 'board', in this case that is a rectangular
                        area of a Google Map. To start a new battle, click the <i class="fa fa-plus"></i> at
                        the top of the battles list and then
                        <li>select the era for the battle (which affects the type of ships that are available)
                        <li>click on the map to indicate where you want to have the battle take place, and
                        <li>click SAVE.
                        <p class="w3-small">Note that Google is consulted about the elevation of the point
                        and the game will not allow a battle to take place on anything that
                        Google thinks is above 4m. This can mean that low lying parts of
                        land can be selected, which may look odd, but there are lots of
                        blue sea on Google Maps that have elevation records of 1-4m. hmmm.
                        <p>The new battle will then appear on the active battles list as
                        awaiting players.`,

                       `Click the <i class="fa fa-anchor"></i> button to join your
                        squadron(s) to any battle that is awaiting players or awaiting
                        squadrons. The Prepare for Battle pop-up then allows you to:
                        <li>click an available squadron up into the battle list;
                        <li>select the side for the squadron - there are always two
                        sides ie 1 and 2; and
                        <li>select a player for the squadon - you don't have to own
                        a squadron to play it, you can nominate yourself, other players
                        or the AI to command each squadron.
                        <br><span class="w3-tiny">Note that squadrons without any ships
                        will not show up as being available.</span>
                        <p>Closing the pop-up by clicking the x at the top right will
                        leave all squadron selections in place.
                        <p>Clicking CANCEL will deselect all squadrons and remove the
                        battle from the game.
                        <p>Clicking CHECK will cause a review to be conducted to see
                        if the game is ready for ships to be deployed. The results of
                        the review will be shown and the battle advanced to awaiting
                        deployment if all is ship shape.`,

                       `Each ship has parts and crew that get damaged during battle. The
                        health of each is shown on a ship card during the battle, with
                        damaged parts in red eg

<div class="gnw-shipGrid w3-margin-top"><div id="health|-MdHGpkITV5B6sIYhFYN|rudder-p" class="w3-cell-top">-</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p1" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p2" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p3" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p4" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p5" class="w3-tiny w3-text-red">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p6" class="w3-tiny w3-text-red">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p7" class="w3-tiny" style="visibility: hidden;">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-p8" class="w3-tiny" style="visibility: hidden;">|||</div><div></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-1" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-2" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-3" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-4" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-5" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-6" class="w3-border w3-grey" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-7" class="w3-border w3-red" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|hull-8" class="w3-border w3-red" style="margin-top: 3px; height: 10px;"></div><div id="health|-MdHGpkITV5B6sIYhFYN|rudder-s" class="w3-cell-top" style="line-height: 5px;">-</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s1" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s2" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s3" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s4" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s5" class="w3-tiny">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s6" class="w3-tiny w3-text-red">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s7" class="w3-tiny" style="visibility: hidden;">|||</div><div id="health|-MdHGpkITV5B6sIYhFYN|oar-s8" class="w3-tiny" style="visibility: hidden;">|||</div></div>

                       <li class="w3-margin-top">The port side, with a tiller at the stern and a bank of oars,
                       each of which can be damaged;
                       <li>The main hull of the vessel, which can be progressively damaged or holed;
                       <li>The starboard side, also with a tiller and bank of oars;
                       <li> The mast and sail, which are not shown but can also be damaged;
                       <p>A ship without a tiller cannot change course. A ship without oars
                       on either side cannot row. A ship without a mast cannot sail. A ship
                       without a hull will sink, unless it is grappled to a larger ship.
                       <p>Holed vessels will take water, causing hull damage, until the crew
                       plugs the hole.`,

                       `A ship's crew is made up of the:
                       <li><b>Admiral</b> who is present on the flagship as a supernumary. The
                       Admiral can be lost during battle which may cause the entire
                       squadron to lose morale and retreat;
                       <li><b>Trierarch</b> (Captain), whose role you take to issue orders to the
                       rest of the crew each turn. The Trierarch can be lost during battle
                       which may cause the crew's morale to break. The flagship will
                       have the Admiral replace its Trierarch if he is lost.
                       <li><b>Kybernētēs</b> (Helmsman) who is in charge of the deck crew
                       and uses the stern tillers to change course. The Kybernētēs
                       can be lost during battle. If lost, the Kybernētēs will be
                       replaced by an experienced deck crewman, if one is available.
                       A ship without a Kybernētēs cannot change course no matter
                       what the Trierarch may order.`,

                       `<li><b>Rowers</b> who man the banks of oars on either the port
                       or starboard side. Rowers can
                       <br>- ship oars, to avoid damage during battle or while sailing,
                       <br>- get progressively lost during battle,
                       <br>- get exhausted and are only able to manage 4 turns of full speed,
                       <br>- be tranferred from a good to a damaged side to balance the ship's propulsion.
                       <br>A ship without rowers can not be rowed, no matter what the
                       Trierarch may order. <i>Out of interest, it seems
                       that Greek ships did not use slaves as rowers, rather having citizens
                       take these places which helped cement the city comaradarie and
                       egalitarianism.</i>
                       <li><b>Sailors</b> or Deck Crew who can raise or lower the sails and
                       be progressively lost during battle;
                       <li><b>Archers</b> who will fire upon nearby enemy ships
                       and be progressively lost during battle;
                       <li><b>Epibatai</b> (Marines) who can grapple and board enemy
                       ships, defend against boarders and be progressively lost during battle.`,

                       `Once a battle is listed as awaiting orders, you can click the
                        anchor to bring up the battle map and information where you
                        can enter your orders or simply watch proceedings.
                        <p>The battle map can't be resized and roughly shows the
                        visibility at sea from a ship's deck. The map can be dragged.
                        <p>To the right of the map is a log, showing significant
                        events while the last turn was played out.
                        <p>A health card for each ship is shown above and below the
                        map and a ship marker shown on the map in either blue (my
                        side) or red (the enemy). Clicking on a ship's health card
                        will centre the map on that ship and bring up the panel
                        to allow orders to be entered. Think of this as the Trierarch
                        yelling orders to the crew.
                        <p>Each turn represents about 1 minute. A trireme at
                        full (ramming) speed does about 10knts, so can travel about
                        a bit over 300m in a minute. Or about 30m at slow-ahead speed.
                        So the Trierarch is setting orders for the next minute, which
                        can include a pause before another order e.g. Increase speed,
                        wait, wait, wait, Port!`,

                        `Orders that can be issued by the Trierarch are:
                        <li>Rowers: increase speed, reduce speed, ship oars, transfer
                        sides to balance the ship propulsion;
                        <li>Helm: port, starboard;
                        <li>Crew: raise sail, lower sail;
                        <li>Marines: grapple and board.
                        <p>Rowing speeds are:
                        <div class="w3-border w3-center w3-margin">Back</div>
                        <div class="w3-border w3-center w3-margin">Stop</div>
                        <div class="w3-border w3-center w3-margin">Slow</div>
                        <div class="w3-border w3-center w3-margin">Cruise</div>
                        <div class="w3-border w3-center w3-margin">Full</div>
                        <div class="w3-tiny">
                          Note that
                          <br>- 'port' means to put the tiller
                          astarboard so that the ships bow turns to port when moving
                          forward or the ships stern turns to port when moving back,
                          <br>- stationary vessels or those that have no rudders
                          plus oars on only one side, cannot turn,
                          <br>- larger ships have a larger turning circle i.e. they
                          have a delay after each turn before another turn order
                          can be executed - see the ship definitions for the delays
                          on each type,
                          <br>- rowers can only change speed
                          once per turn; and
                          <br>- sails cannot be raised and lowered
                          in the same turn.
                        </div>
                        <p>Clicking NEXT above the log sheet triggers a review and
                        if all players are ready then the orders are executed.`,

                        `If a ship is sunk, the remaining crew are considered to
                        be surviving in the water.
                        <p>Each turn those survivors may drown. The ship's card will
                        show the suviving numbers going red if they are lost.
                        <p>Survivors can be picked up and supplement another ship's
                        crew if that other ship moves slowly through the area
                        where the survivors are floating.
                        <p>Survivors can swim a short distance, use the normal
                        orders panel for the ship to set the direction.`,

                       "<p class='w3-animate-zoom w3-xxlarge'>Weather Effects..."]
  let gCardTimer = null;
  const dbBattlesRef = dbRootRef.child('GNW').child('Battles');
  const dbCampaignsRef = dbRootRef.child('GNW').child('Campaigns');
  const dbCrumbsRef = dbRootRef.child('GNW').child('Crumbs');
  const dbShipsRef = dbRootRef.child('GNW').child('Ships');
  const dbSquadronsRef = dbRootRef.child('GNW').child('Squadrons');
  const gShipNames = [] // from http://www.users.globalnet.co.uk/~loxias/triremenames2.htm
  const gTick = "<i class='fa fa-check' style='color:green'></i>";
  const gCross = "<i class='fa fa-close' style='color:red'></i>";

  // Dice function, as a variable, returns roll of d sided die eg 1-6 from a d6
  var D = function(d) {return Math.floor(Math.random() * d) + 1;}
  const gAverageDice = [2, 3, 3, 4, 4, 5];

  // Create a google terrain map with no controls that can be used to pick
  // the site for the battle.
  const initLatLng = { lat: 38.490934, lng: 26.208423 };
  const gMapStyles = [
   {"featureType":"road", "elementType":"all", "stylers": [{ "visibility":"off" }]},
   {"featureType":"poi", "elementType":"all", "stylers": [{ "visibility":"off" }]}
 ];

  const battleSiteMap = new google.maps.Map(document.getElementById("mapLocationPicker"), {
    zoom: 6, mapTypeControl: false, disableDefaultUI: true, scaleControl: true,
    center: initLatLng, mapTypeId: 'terrain', styles: gMapStyles});
  battleSiteMap.addListener( 'click', (e) => { // move marker to map click position
    gnwMarker.place(battleSite, e.latLng, battleSiteMap);
  });
  battleSiteMap.addListener( 'rightclick', (e) => { // show known locations
    gnwMarker.showKnown(battleSiteMap);
  });

  // Create a google terrain map with no controls that will be used to deploy
  // the squadrons.
  const battleDeployMap = new google.maps.Map(document.getElementById("modalBattleDeployMap"), {
    zoom: 14, mapTypeControl: false, disableDefaultUI: true, scaleControl: true,
    center: initLatLng, mapTypeId: 'terrain', styles: gMapStyles});
  battleDeployMap.addListener('rightclick', (e) => {gnwMarker.showKnown(battleDeployMap);});

  // Prepare a marker for the battle site and listen for clicks on the map to
  // change the battle site location. ALso listen for the battle site being set,
  // which can only happen if the map is clicked on water, then enable the save
  // button.
  const battleSite = new google.maps.Marker();
  battleSite.setMap(battleSiteMap);
  battleSite.addListener('position_changed', () => {
    get('modalNewSave').disabled = false;
  });

  // Create a google terrain map with no controls that will be used to conduct
  // the sgame turns.
  const battleTurnMap = new google.maps.Map(document.getElementById("modalBattlePlayMap"), {
    zoom: 15, mapTypeControl: false, disableDefaultUI: true, scaleControl: true,
    center: initLatLng, mapTypeId: 'terrain', scrollwheel:false,
    styles: gMapStyles});

  // populate the Cities dropdown on the Squadron Management modal
  populateCitiesSelect( get('modalMngSquadCity') );

  // in all pages, set a document level listener for a click not on a button
  // (because we don't want to process a click on the menu stack button) and, if
  // detected and the menu sidebar is open, close the sidebar
  document.addEventListener("click", function(e) {
    const /** HTMLElement */ elSide = get('sideMenu');
    if (elSide == null) {return;}
    const /** string */ disp = elSide.style.display;
    const /** string */ tagN = e.srcElement.tagName;
    if(tagN != 'BUTTON' && disp == 'block') {elSide.style = "display:none";}
  });


  // ---------------  AUTHORISED SECTION
  // when the database is connected and the user authorised...
  document.addEventListener("pgUserAuthorised", function(e) {
    // build the reference objects that specify the various types of ship
    //          Type      Decks Length Beam Hull Oars Crew Bows Mar Cruise Full TurnDelay Era  Light    Moderate
    defineShip('Pentaconter', 1, 0.75, 0.25, 2,  2,    2,   2,  2,    2,    3,  0,   0,   800, 5, 6, 7, 0, 6, 7);
    defineShip('Bireme',      2, 1.5,  0.5,  3,  3,    2,   1,  5,    3,    5,  1,   1,   800, 4, 5, 6, 1, 6, 7);
    defineShip('Trireme',     3, 1.5,  0.5,  4,  4,    4,   2, 10,    3,    5,  1,   2,   500, 4, 5, 6, 1, 6, 7);
    defineShip('Quadrireme',  4, 1.5,  0.5,  6,  5,    4,   3, 15,    3,    5,  2,   3,   400, 3, 4, 5, 2, 5, 6);
    defineShip('Quinquereme', 5, 1.5,  0.5,  8,  6,    4,   4, 20,    2,    4,  2,   3,   300, 3, 4, 5, 2, 5, 6);

    // build the available eras radio-group in the modalNew
    for (let i=0; i<gEras.length; i++) {
      const rb = document.createElement('input');
      rb.type = "radio";
      rb.name = "era";
      rb.value = gEras[i];
      rb.id = "modalNewEra" + i;
      rb.onchange = function() {modalNewEraSelected(this)};
      get('modalNewEraGroup').appendChild(rb);

      const lbl = document.createElement('label');
      lbl.innerText = " " + gEras[i] + "BC ";
      get('modalNewEraGroup').appendChild(lbl);
    }

    // build list of potential ship names in array, ready for use when new
    // ships are named, by reading the list from the database.
    dbRootRef.child('GNW').child('Names').once('value', snapNames => {
      snapNames.forEach(snapName => {
        const nm = [snapName.key, decodeURIComponent(snapName.val().descr)];
        gShipNames.push(nm);
      });
    });


    // and set a timer to cycle through the ship definitions
    cardChange(); // initially populate the definition card being shown

    // Check the user for their current campaign and monitor them for changes
    // to that campaign. If none selected, throw up a modal prompt to select
    // one, otherwise set the main page watchers for that campaign.
    const userId = get('userName').userId;
    dbRootRef.child('Users').child(userId).on('value', snapUser => {
      const gnwInfo = snapUser.val().GNW;
      const campId = (gnwInfo == null) ? null: snapUser.val().GNW.campaign;
      if (campId == null) { // no campaign selected
        modalCampPick();
      } else { // campaign is selected, get it's details and setup main page
        dbCampaignsRef.child(campId).once('value', snapCampaign => {
          get('campaignName').innerText = snapCampaign.val().name;
          get('campaignId').innerText = snapCampaign.key;
          resetMainPageWatchers(campId);
        });
      }
    });
  }); // end pgUserAuthorised event

    // set firebase watchers to keep the list of squadrons up to date, creating
    // a new table row and populating it if an entry is added, updating or
    // deleting the relevant row if an entry is changed or removed.
  function resetMainPageWatchers(campId) {
    dbSquadronsRef.off();
    emptyTable('tSquadronsBody');

    dbSquadronsRef.on('child_added', snapSquadron => {
      if (snapSquadron.val().campaign == campId) {
        squadronRowAdd(snapSquadron.key);
        squadronRowChange(snapSquadron);
      }
    });

    dbSquadronsRef.on('child_changed', snapSquadron => {
      if (snapSquadron.val().campaign == campId) {
        squadronRowChange(snapSquadron);
      }
    });

    dbSquadronsRef.on('child_removed', snapSquadron => {
      const squadRow = get(snapSquadron.key);
      if (squadRow != null) {
        const rowNo = squadRow.rowIndex;
        get('tSquadronsBody').deleteRow(rowNo - 1);
      }
    });

    // set firebase watchers to keep the list of battles up to date, creating
    // a new table row and populating it if an entry is added, updating or
    // deleting the relevant row if an entry is changed or removed.
    dbBattlesRef.off();
    emptyTable('tBattlesBody');

    dbBattlesRef.on('child_added', snapBattle => {
      if (snapBattle.val().campaign == campId) {
        battleRowAdd(snapBattle.key);
        battleRowChange(snapBattle);
      }
    });

    dbBattlesRef.on('child_changed', snapBattle => {
      battleRowChange(snapBattle, campId);
    });

    dbBattlesRef.on('child_removed', snapBattle => {
      let battleRow = get(snapBattle.key);
      if (battleRow != null) {
        const rowNo = battleRow.rowIndex;
        console.log('remove', rowNo);
        get('tBattlesBody').deleteRow(rowNo - 1);
      }
    });
  }

  /**
  * Updates page row for a squadron to reflect the latest database values
  */
  function squadronRowAdd(squadId) {
    const squadRow = get('tSquadronsBody').insertRow(-1);
    squadRow.insertCell(0); // name column
    squadRow.insertCell(1); // city
    squadRow.insertCell(2); // ships
    squadRow.insertCell(3); // action button column

    const btn = document.createElement('button');
    btn.innerHTML = "<i class='fa fa-anchor' style='font-size:14px'></i>";
    btn.title = "Manage Squadron";
    btn.onclick = function() {gnw.squadronAction(this)};
    squadRow.cells[3].appendChild(btn);

    squadRow.id = squadId;
  }

  function squadronRowChange(snapSquadron) {
    const squadRow = get(snapSquadron.key);
    if (squadRow == null) {return;}

    squadRow.cells[0].innerText = snapSquadron.val().title || snapSquadron.val().playerName;
    squadRow.cells[1].innerText = snapSquadron.val().city;
    squadRow.cells[2].innerText = snapSquadron.val().shipCount;
  }

  /**
  * Updates page row for a battle to reflect the latest database values
  */
  function battleRowAdd(battleId) {
    const battleRow = get('tBattlesBody').insertRow(-1);
    battleRow.insertCell(0); // era column
    battleRow.insertCell(1); // cities involved column
    battleRow.insertCell(2); // awaiting info column
    battleRow.insertCell(3); // action button column

    const btn = document.createElement('button');
    btn.innerHTML = "<i class='fa fa-anchor' style='font-size:14px'></i>";
    btn.onclick = function() {gnw.battleAction(this)};
    battleRow.cells[3].appendChild(btn);

    battleRow.id = battleId;
  }

  function battleRowChange(snapBattle) {
    const battleRow = get(snapBattle.key);
    if (battleRow == null) {return;}

    battleRow.cells[0].innerText = snapBattle.val().era + 'BC';
    battleRow.cells[1].innerText = 'tba';
    battleRow.cells[2].innerText = gAwaiting[snapBattle.val().awaiting];

    // now build the cities descriptor from the squadrons
    let cities = ['', '', '']; // one entry for each side, ignore zero
    snapBattle.child('Squadrons').forEach(snapSquad => {
      const side = snapSquad.val().side;
      const city = snapSquad.val().city;
      if (cities[side].indexOf(city) < 0) {cities[side] += ' ' + city;}
    });
    battleRow.cells[1].innerText = cities[1].trim() + ' vs ' + cities[2].trim();
  }






  //----------------------- COMMON ROUTINES SECTION
  // Get the the specified element on the page
  function get(elementId) {
    return document.getElementById(elementId);
  }

  // Get the the value specified element on the page as a Date
  function getDate(elementId) {
    const /** HTMLElement */ el = document.getElementById(elementId);
    const /** Date */ objDate = Date.parse(el.value);
    return objDate;
  }

  // Set the text value of the specified element on the page
  function set(elementId, elementText) {
    document.getElementById(elementId).innerText = elementText;
  }

  // change the display style to show the specified element
  function show(elementId, style="block") {
    document.getElementById(elementId).style.display = style;
  }

  // change the display style to hide the specified element
  function hide(elementId) {
    document.getElementById(elementId).style.display = "none";
  }

  // sorts one of the group List tables into asc numeric order
  function sortTable(id) {
    const /** HTMLElement */ tbl = get(id);
    const /** number */ noRows = tbl.rows.length;
    let /** boolean */ switching = true;

    // Make a loop that will continue until no switching has been done:
    while (switching) {
      switching = false; // default is that no switch was required

      // scan all rows but last, comparing to next one. No header so start at zero.
      // and switch rows if it is greater than next one.
      for (let i=0; i<(noRows-1); i++) {
        let /** number */ x = tbl.rows[i].cells[0].innerText;
        let /** number */ y = tbl.rows[i+1].cells[0].innerText;

        if (tbl.rows[i].cells[0].firstChild.firstChild != null) {
          x = tbl.rows[i].cells[0].firstChild.firstChild.value;
          y = tbl.rows[i+1].cells[0].firstChild.firstChild.value;
        }

        if (x > y) {
          tbl.rows[i].parentNode.insertBefore(tbl.rows[i + 1], tbl.rows[i]);
          switching = true;
        }
      }
    }
  }

  // emtpies all rows from the specified table
  function emptyTable(id) {
    const /** HTMLElement */ tbl = get(id);
    const /** number */ noRows = tbl.rows.length;
    for (let i=noRows-1; i>=0; i--) {tbl.deleteRow(i);}
  }

  // emtpies all children from the specified node
  function emptyNode(id) {
    const /** HTMLElement */ node = get(id);
    const /** number */ noChilds = node.children.length;
    for (let i=noChilds-1; i>=0; i--) {node.removeChild(node.children[i]);}
  }

  // creates and returns an HTML Select Option element
  function createOption(optValue, optLabel) {
    const selOpt = document.createElement('option');
    selOpt.value = optValue;
    selOpt.label = optLabel;
    return selOpt;
  }

  function populateCitiesSelect( selCity ) {
    for (let i=0; i<gCities.length; i++) {
      selCity.add( createOption(gCities[i], gCities[i]) );
    }
  }

  function textArrayToAndString(textArray) {
    const parts = textArray.trim().split(' ');
    let textString = parts[0];
    for (let i=1; i<parts.length; i++) {textString += ' and ' + parts[i];}
    return textString;
  }




  //----------------------- SHIP DEFINITION SECTION
  /**
  * Creates an entry for a type of ship in the global gTypes object:
  * decks - number of decks of rowers eg a trireme has 3
  * era - from roughly which century BC were these ships in common use
  * length - rough length of ship type, in game units of roughly 50'
  * hull - relative hull strength
  * oars - sets of oars per side, one set being ~20 oars
  * crew - the working compliment of the ship, made up from:
  *   rowers - those manning the oars, calculated from the oars attribute
  *   sailors - the deck crew
  *   archers - archers on deck, stationed fore and aft
  *   marines - soldiers on deck
  * speed - how fast the ship can be propelled by oars, normally and when
  *         crippled, in game units of roughly 2 knots
  *   slow - slow ahead and astern
  *   cruise - cruising speed
  *   full - ramming speed, which will exhaust rowers very quickly
  * turnDelay - indicator of nimbleness, how long after a turn before another
  *             can be executed, at the various speeds
  *
  */
  function defineShip(shType, shDecks, shLength, shBeam,
                      shHull, shOars,
                      shSailors, shArchers, shMarines,
                      shCruise, shFull, shTurnCruise, shTurnFull,
                      shEra,
                      shLightBeat, shLightReach, shLightRun,
                      shModBeat, shModReach, shModRun) {

    const speedNormal = {slow: 1, cruise: shCruise, full: shFull};
    const speedCrippl = {slow: 1, cruise: Math.ceil(shCruise/2), full: Math.ceil(shFull/2)};
    const crew = {sailors: shSailors, archers: shArchers, marines: shMarines};
    const turnDelay = {slow: Math.min(1, shTurnCruise), cruise: shTurnCruise, full: shTurnFull};
    const sailNone = {beating: 0, reaching: 0, running: 0};
    const sailLight = {beating: shLightBeat, reaching: shLightReach, running: shLightRun};
    const sailMod = {beating: shModBeat, reaching: shModReach, running: shModRun};

    const shipDefinition = {
      decks: shDecks, hull: shHull, oars: shOars,
      crew: crew,
      length: shLength, beam: shBeam,
      speed: speedNormal, crippled: speedCrippl, turnDelay: turnDelay,
      sailing: {0: sailNone, 1: sailNone, 2: sailLight, 3: sailLight, 4: sailMod, 5: sailMod},
      era: shEra};

    gTypes[shType] = shipDefinition;

    // now make sure that this ship's era is in the eras list
    if (!gEras.includes(shEra)) {gEras.push(shEra);}

    // and this ship type can be built on the squadron management modal
    const btn = document.createElement('button');
    btn.className = "pg-btn w3-bar-item w3-margin-left w3-margin-top";
    btn.innerText = shType;
    btn.title = "Build a ship";
    btn.onclick = function() {gnw.modalMngSquadBuild(this);}
    get('modalMngSquadBuildButtons').appendChild(btn);
  }

  /**
  * Displays game information on the page, one 'page' type at a time and
  * changed every few seconds. Information about the ship types and weather
  * effects are generated from the master data lists
  */
  function cardChange(dirn=+1, pause=6000) {
    clearTimeout(gCardTimer); // incase click arrow, want auto time to cancel
    const shNames = Object.keys(gTypes); // generate array of ship names
    const cardList = gIntroList.concat(shNames, gRulesList, gWindTitle); // concatenate info lists

    // Pick the next info card to be displayed
    const currentlyShowing = get('cardHeading').innerText;
    let idx = cardList.indexOf(currentlyShowing); // find current info card
    idx = idx + dirn; // index of next card
    if (idx >= cardList.length) {idx = 0;} // loop back once get to start
    if (idx < 0) {idx = cardList.length - 1;} // loop back to end

    // Display the appropriate type of card
    const iIntro = gIntroList.indexOf( cardList[idx] );
    const iShip = shNames.indexOf( cardList[idx] );
    const iRules = gRulesList.indexOf( cardList[idx] );
    const beaufort = gWindTitle.indexOf( cardList[idx] );

    if (iShip >= 0) {cardShipType(shNames[iShip]);
    } else if (beaufort >= 0) {cardWeatherEffects(beaufort);
    } else if (iIntro >= 0) {cardStandard(iIntro, gIntroList, gIntroDescr);
    } else if (iRules >= 0) {cardStandard(iRules, gRulesList, gRulesDescr);}

    // Page content is initially hidden as there is a long pause while
    // firebase is initialised. These shows page info once a card is ready to
    // be shown.
    show('gnwMain');
    show('gnwFooter');
    hide('gnwIntro');

    // Wait a few seconds then cycle to the next card
    gCardTimer = setTimeout(cardChange, pause);
  }

  /*
  * Builds a ship type into card showing the different attributes of the type
  */
  function cardShipType(shipType) {
    const convL = 53.333; // game units to feet, length conversion
    const convS = 2; // game units to knots, speed conversion
    const convC = 3; // game units to crew numbers
    get('cardHeading').innerText = shipType;
    get('cardDecks').innerText = gTypes[shipType].decks;
    get('cardBeam').innerText = Math.ceil(gTypes[shipType].beam * convL);
    get('cardLength').innerText = Math.ceil(gTypes[shipType].length * convL);
    get('cardEra').innerText = gTypes[shipType].era;

    get('cardRowers').innerText = gTypes[shipType].oars * 2 * 20;
    get('cardSailors').innerText = gTypes[shipType].crew.sailors * convC;
    get('cardArchers').innerText = gTypes[shipType].crew.archers * convC;
    get('cardMarines').innerText = gTypes[shipType].crew.marines * convC;

    get('cardSpeed11').innerText = gTypes[shipType].speed.slow * convS;
    get('cardSpeed21').innerText = gTypes[shipType].speed.cruise * convS;
    get('cardSpeed31').innerText = gTypes[shipType].speed.full * convS;

    get('cardSpeed12').innerText = gTypes[shipType].crippled.slow * convS;
    get('cardSpeed22').innerText = gTypes[shipType].crippled.cruise * convS;
    get('cardSpeed32').innerText = gTypes[shipType].crippled.full * convS;

    get('cardTurn1').innerText = gTypes[shipType].turnDelay.slow;
    get('cardTurn2').innerText = gTypes[shipType].turnDelay.cruise;
    get('cardTurn3').innerText = gTypes[shipType].turnDelay.full;

    get('cardSpeed41').innerText = gTypes[shipType].sailing[2].beating * convS;
    get('cardSpeed42').innerText = gTypes[shipType].sailing[2].reaching * convS;
    get('cardSpeed43').innerText = gTypes[shipType].sailing[2].running * convS;

    get('cardSpeed51').innerText = gTypes[shipType].sailing[4].beating * convS;
    get('cardSpeed52').innerText = gTypes[shipType].sailing[4].reaching * convS;
    get('cardSpeed53').innerText = gTypes[shipType].sailing[4].running * convS;

    show('cardShipInfo1');
    show('cardShipInfo2');
    show('cardShipInfo3');
    hide('cardWeatherInfo');
    hide('cardStandardInfo');

    show('cardDefinition');
  }

  /*
  * Builds a weather info card showing wind description and effects.
  */
  function cardWeatherEffects(beaufort) {
    get('cardHeading').innerText = gWindTitle[beaufort];

    get('cardWeatherDescr').innerHTML = '<i>' + gWindDescr[beaufort] + '</i>';
    get('cardWeatherSailing').innerHTML = (gWindEffect[beaufort][0] == 0) ? "No sailing," : "Normal sailing,";
    get('cardWeatherRowing').innerHTML = (gWindEffect[beaufort][1] == 0) ? "no rowing." : "normal rowing.";
    get('cardWeatherCrippled').innerHTML = (gWindEffect[beaufort][2] == 1) ? "Crippled ships limited to slow speed." : "";
    get('cardWeatherWater1').innerHTML = (gWindEffect[beaufort][3] == 1) ? "Any vessel not heading directly into the breeze may take water." : "";
    get('cardWeatherWater2').innerHTML = (gWindEffect[beaufort][4] == 1) ? "All vessels will take water!" : "";


    hide('cardShipInfo1');
    hide('cardShipInfo2');
    hide('cardShipInfo3');
    show('cardWeatherInfo');
    hide('cardStandardInfo');

    show('cardDefinition');
  }

  /*
  * Builds a weather info card showing wind description and effects.
  */
  function cardStandard(idx, arrNames, arrDescr) {
    get('cardHeading').innerText = arrNames[idx];

    get('cardStandardInfo').innerHTML = arrDescr[idx];

    hide('cardShipInfo1');
    hide('cardShipInfo2');
    hide('cardShipInfo3');
    hide('cardWeatherInfo');
    show('cardStandardInfo');

    show('cardDefinition');
  }







  //----------------------- MANAGE CAMPAIGN MODALS SECTION
  /*
  * Establishes watchers to mantain a list of campaigns, where the
  * campaign name and year can be adjusted or a campaign selected for play.
  */
  function modalCampPick() {
    const tbl = get('modalCampPickList');
    emptyTable('modalCampPickList');
    dbCampaignsRef.off(); // incase already in place

    dbCampaignsRef.on('child_added', snapCamp => {
      const row = tbl.insertRow(-1);
      row.id = snapCamp.key;
      const cPick = row.insertCell(-1);
      const cName = row.insertCell(-1);
      const cYear = row.insertCell(-1);
      const cAction = row.insertCell(-1);

      const rb = document.createElement('input');
      rb.type = "radio";
      rb.className = "w3-radio";
      rb.name = "campPick";
      rb.value = snapCamp.key;
      rb.onchange = function() {modalCampPickSelected(this)};
      cPick.appendChild(rb);

      const nm = document.createElement('input');
      nm.type = "text";
      nm.className = "w3-input";
      nm.onchange = function() {modalCampPickChange(this, 'name')};
      cName.appendChild(nm);

      const yr = document.createElement('input');
      yr.type = "number";
      yr.className = "w3-input";
      yr.min = 0; yr.max = 800;
      yr.onchange = function() {modalCampPickChange(this, 'year')};
      cYear.appendChild(yr);

      modalCampPickRefreshRow(snapCamp);
    });

    dbCampaignsRef.on('child_changed', snapCamp => {
      modalCampPickRefreshRow(snapCamp)
    });

    show('modalCampPick');
  }

  /*
  * Updates changed values of a campaign on the campaign picker. Assumes
  * - selection radio button is in col 0
  * - name input is first child in col 1
  * - year input is first child in col 2
  */
  function modalCampPickRefreshRow(snapCamp) {
    const pageCampId = get('campaignId').innerText;
    const row = get(snapCamp.key);
    const elRadio = row.cells[0].firstChild;
    const elName = row.cells[1].firstChild;
    const elYear = row.cells[2].firstChild;

    elRadio.checked = (snapCamp.key == pageCampId);
    elName.value = snapCamp.val().name;
    elYear.value = snapCamp.val().year;
  }

  /*
  * Adds a campaign to the database, which will trigger a page update
  */
  function modalCampPickNew() {
    dbCampaignsRef.push({name: 'tba', year:500});
  }

  /*
  * Changes the value of one element in a campaign. Called when a table row
  * value changes and assumes that the changed element is an INPUT ie has a value.
  */
  function modalCampPickChange(elChanged, attrName) {
    const campId = elChanged.parentNode.parentNode.id;
    const cmd = {};
    cmd[attrName] = elChanged.value;
    dbCampaignsRef.child(campId).update(cmd);
  }

  /*
  * Updates the current user's record with the id of the campaign that they
  * have selected to play in. Will trigger a reset of the main tables.
  */
  function modalCampPickSelected(rbClicked) {
    const campId = rbClicked.value;
    const userId = get('userName').userId;
    dbRootRef.child('Users').child(userId).child('GNW').update({campaign: campId});
    hide('modalCampPick');
  }






  //----------------------- MANAGE SQUADRON MODAL SECTION
  /**
  * Creates a new squadron entry on the database, for the current user, then
  * calls the squadron management function to show details
  */
  function modalNewSquadron() {
    const currUserId = get('userName').userId;
    const currUserNm = get('userName').innerText;
    const campId = get('campaignId').innerText;
    const dbNewSquadron = dbSquadronsRef.push({playerId: currUserId,
                                               playerName: currUserNm,
                                               campaign: campId,
                                               shipCount: 0});
    modalMngSquadron(dbNewSquadron.key);
  }

  /**
  * Performs the relevant action on a squadron depending on which button is
  * clicked and the state of the squadron
  */
  function squadronAction(btn) {
    const row = btn.parentNode.parentNode;
    const squadId = row.id;
    modalMngSquadron(squadId);

  }

  /**
  * Populates and then shows the Squadron Management modal for the given
  * squadron
  */
  function modalMngSquadron(squadronId) {
    dbSquadronsRef.child(squadronId).once('value', snapSquad => {
      get('modalMngSquadId').innerText = squadronId;
      get('modalMngSquadCity').value = snapSquad.val().city;
      get('modalMngSquadTitle').value = snapSquad.val().title;
      modalMngSquadSetCityWatchers();

      const playerId = snapSquad.val().playerId;
      get('modalMngSquadPlayerId').innerText = playerId; // hidden on modal
      // lookup player's name on the database
      dbRootRef.child('Users').child(playerId).once('value', snapUser => {
        get('modalMngSquadPlayerName').innerText = snapUser.val().name;
        show('modalMngSquadron');
      });
    });
  }

  function modalMngSquadChangeCity() {
    const squadronId = get('modalMngSquadId').innerText;
    dbSquadronsRef.child(squadronId).update({city: get('modalMngSquadCity').value});
    modalMngSquadSetCityWatchers();
  }

  function modalMngSquadChangeTitle() {
    const squadronId = get('modalMngSquadId').innerText;
    dbSquadronsRef.child(squadronId).update({title: get('modalMngSquadTitle').value});
    modalMngSquadSetCityWatchers();
  }

  /**
  * Sets firebase watchers to maintain the list of ships in the city
  */
  function modalMngSquadSetCityWatchers() {
    const city = get('modalMngSquadCity').value;
    const tblCity = get('modalMngSquadCityShips');
    const tblSquad = get('modalMngSquadShips');
    emptyTable('modalMngSquadCityShips'); // reset before watchers get going
    emptyTable('modalMngSquadShips'); // reset before watchers get going
    get('modalMngSquadCity').disabled = false; // if no ships, can change city

    dbShipsRef.orderByChild('city').equalTo(city).off(); // TODO previous city??
    dbShipsRef.orderByChild('city').equalTo(city).on('child_added', snapShip => {
      const squadId = snapShip.val().squadron;
      const row = (squadId == null) ? tblCity.insertRow(0): tblSquad.insertRow(0);
      row.id = snapShip.key;
      row.insertCell(0); // flagship radio button
      row.insertCell(1); // type
      row.insertCell(2); // name
      row.insertCell(3); // state
      row.insertCell(4); // join/leave button
      row.insertCell(5); // delete/repair button

      // add a flag button that indicates and allows change of squadron's flagship
      const btnFlag = document.createElement('span');
      btnFlag.innerHTML = "<i class='fa fa-flag-o' style='font-size:14px'></i>";
      btnFlag.onclick = function() {gnw.modalMngSquadFlagSelected(this)};
      row.cells[0].appendChild(btnFlag);


      // adjust the join/leave button depending on whether the ship is currently
      // in a squadron or not
      const dirn = (squadId == null) ? "right": "left";
      const action = (squadId == null) ? "join": "leave";
      const btn = document.createElement('button');
      btn.innerHTML = "<i class='fa fa-arrow-" + dirn + "' style='font-size:14px'></i>";
      btn.onclick = function() {gnw.modalMngSquadShipAction(this, action)};
      row.cells[4].appendChild(btn);

      const btnBin = document.createElement('button');
      btnBin.innerHTML = "<i class='fa fa-trash-o' style='font-size:14px'></i>";
      btnBin.onclick = function() {gnw.modalMngSquadShipAction(this, 'delete')};
      row.cells[5].appendChild(btnBin);

      const btnRepair = document.createElement('button');
      btnRepair.innerHTML = "<i class='fas fa-hammer' style='font-size:14px'></i>";
      btnRepair.onclick = function() {gnw.modalMngSquadShipAction(this, 'repair')};
      row.cells[5].appendChild(btnRepair);

      modalMngSquadShipUpdateRow(snapShip);
    });

    dbShipsRef.orderByChild('city').equalTo(city).on('child_changed', snapShip => {
      modalMngSquadShipUpdateRow(snapShip);
    });

    dbShipsRef.orderByChild('city').equalTo(city).on('child_removed', snapShip => {
      const row = get(snapShip.key);
      if (row == null) {return;}
      if (snapShip.val().squadron == null) {
        tblCity.deleteRow(row.rowIndex);
      } else {
        tblSquad.deleteRow(row.rowIndex);
      }
    });
  }

  /**
  * Finds the table row for this ship, which might be on either the city or
  * the squadron table and updates the row to reflect the latest values from
  * the database. Retired ships still have a row but are just hidden, so that
  * they can get shown if they come out of retirement.
  */
  function modalMngSquadShipUpdateRow(snapShip) {
    const row = get(snapShip.key);
    if (row == null) {return;}

    const btnFlag = row.cells[0].firstChild;
    if (snapShip.val().squadron == null || snapShip.val().state > 3) {
      btnFlag.style="display:none";
    } else {
      btnFlag.style="display:block";
      const sfxFlag = (snapShip.val().flagship) ? "checkered": "o";
      btnFlag.innerHTML = "<i class='fa fa-flag-" + sfxFlag + "' style='font-size:14px'></i>";
    }

    row.cells[1].innerText = snapShip.val().type;

    row.cells[2].innerHTML = '<i>' + snapShip.val().name + '</i>';
    for (let i=0; i<gShipNames.length; i++) { // loop through ship names
      if (gShipNames[i][0] == snapShip.val().name) { // if match...
        row.cells[2].title = gShipNames[i][1]; // place descr in hover text
        break; // and stop looping
      }
    }

    row.cells[3].innerText = gShipState[snapShip.val().state];

    // If the ship is not in a squadron, or is in this squadron, show it. And
    // disable the ability to change cities for this squadron if there is
    // already a ship in it.
    const shipAvail = (snapShip.val().squadron == null);
    const thisSquadId = get('modalMngSquadId').innerText;
    const inThisSquad = (snapShip.val().squadron == thisSquadId);
    const elCity = get('modalMngSquadCity');
    if (!elCity.disabled && inThisSquad) {elCity.disabled = true;}

    if (shipAvail || inThisSquad) {
      row.style = "display:table-row"; // make the ship/row visible
    } else {
      row.style = "display:none"; // otherwise, hide the row
    }

    // the join/leave buttons are disabled if the ship is sunk or retired
    row.cells[4].firstChild.disabled = (snapShip.val().state > 3);
    if (snapShip.val().state > 3) {
      row.classList.add("w3-text-gray");
    } else {
      row.classList.remove("w3-text-gray");
    }

    // the delete button is only valid (visible) when a ship is new and not
    // part of squadron
    const btnBin = row.cells[5].children[0];
    const visBin = (snapShip.val().state == 0 & snapShip.val().squadron == null) ? "block": "none";
    btnBin.style.display = visBin;

    // the repair button is only valid (visible) when a ship is crippled
    const btnRepair = row.cells[5].children[1];
    const visRepair = (snapShip.val().state == 2) ? "block": "none";
    btnRepair.style.display = visRepair;
  }

  /**
  * Builds a new ship for the city being managed of a type defined by the
  * button that was clicked
  */
  function modalMngSquadBuild(btn) {
    const shType = btn.innerText;
    const city = get('modalMngSquadCity').value;
    const rndNo = Math.floor(Math.random() * gShipNames.length); // random name
    const shName = gShipNames[rndNo][0];

    const port = {oars: gTypes[shType].oars, rudder: 1};
    const star = {oars: gTypes[shType].oars, rudder: 1};
    const sail = {mast: 1, sail: 1};
    const crew = gTypes[shType].crew;
    crew.captain = 1;
    crew.steersman = 1;
    const health = {port: port, starboard: star, hull: gTypes[shType].hull,
                    crew: crew, holes: 0, fullSpeeds: 4,
                    sailing: sail}
    dbShipsRef.push({city: city, type: shType, name: shName, state: 0, health: health, rowing: 0});
  }

  /**
  * Updates the database entry for a ship to reflect a ship action, such as
  * joining or leaving a squadron, effecting repairs, etc. Changes to the
  * database will trigger a listener update so that the web page reflects
  * the action.
  */
  function modalMngSquadShipAction(btn, action) {
    const squadronId = get('modalMngSquadId').innerText;
    const shipId = btn.parentNode.parentNode.id;

    let cmd = null; let change = 0; let bRebuild = false;
    switch (action) {
      case 'join':   cmd = {squadron: squadronId}; change = +1; bRebuild = true; break;
      case 'leave':  cmd = {squadron: null, flagship: null}; change = -1; bRebuild = true; break;
      case 'repair': cmd = {state: 1}; break;
      case 'retire': cmd = {state: 5}; change = -1; break;
      case 'delete': dbShipsRef.child(shipId).remove(); break;
    }

    if (cmd != null) {dbShipsRef.child(shipId).update(cmd);}

    if (change != 0) { // number of ships in squadron has changed, update db count
      dbSquadronsRef.child(squadronId)
                    .child('shipCount')
                    .set(firebase.database.ServerValue.increment(change));
    }

    // join/leave causes ships to switch tables, so rebuild tables
    if (bRebuild) {modalMngSquadSetCityWatchers();}
  }

  /**
  * Sets the indicated ship as a flagship and runs through all others ships
  * in the squadron to make sure that no others are flagged.
  */
  function modalMngSquadFlagSelected(btn) {
    const squadronId = get('modalMngSquadId').innerText;
    const shipId = btn.parentNode.parentNode.id;
    dbShipsRef.orderByChild('squadron').equalTo(squadronId).once('value', snapShips => {
      snapShips.forEach(snapShip => {
        dbShipsRef.child(snapShip.key).update({flagship: snapShip.key == shipId});
      });
    });
  }





  //----------------------- NEW BATTLE MODAL SECTION
  /**
  * Intialises then shows the new battle modal
  */
  function modalNewBattle() {
    // reset any existing era selection and any existing ships list
    for (let i=0; i<gEras.length; i++) {
      get('modalNewEra' + i).checked = false;
    }

    // hide the map  until an era is selected, disable the Save until
    // a site is selected.
    hide('modalNewMap');
    get('modalNewSave').disabled = true;
    show('modalNewBattle'); // show the modal so that an era can be nominated
  }

  /**
  * Show the battle location map once an era is nominated for the new game,
  * allowing a site to be selected. See the battleSite marker, above, for
  * logic.
  */
  function modalNewEraSelected(rbSelected) {
    gEraSelected = rbSelected.value;
    show('modalNewMap');
  }

  /**
  * Takes a new game definition and writes it to the database in order to
  * effectively start the new game.
  */
  function modalNewSave() {
    hide('modalNewBattle');

    // First, define a new battle record, with weather conditions
    const windDirn = Math.floor(Math.random() * gWindDirn.length); // random direction
    const windStr = gWindProb[Math.floor(Math.random() * gWindProb.length)]; // weighted random strength
    const windFore = Math.floor(Math.random() * gWindForecast.length); // random forecast
    const campId = get('campaignId').innerText;
    const battle = {era: gEraSelected,
                    campaign: campId,
                    site: {lat: battleSite.getPosition().lat(),
                           lng: battleSite.getPosition().lng()},
                    awaiting: 0,
                    turn: 0,
                    wind: {strength: windStr, direction: windDirn, forecast: windFore}};

    // Then push it onto the GNW branch, generating a random key
    const dbNewBattle = dbBattlesRef.push(battle);
  }


  function battleAction(btn) {
    // The table row id is the battleId for the database, get it by working
    // up from the button that was clicked. Then get the awaiting state of
    // that battle to switch to the relevant function for this battle.
    const battleId = btn.parentNode.parentNode.id;
    dbBattlesRef.child(battleId).once('value', snapBattle => {
      // set the measurement ruler for this battle site
      gRuler = new CheapRuler(snapBattle.val().site.lat, 'metres');

      switch (snapBattle.val().awaiting) {
        case 0: modalBattleSetup(snapBattle); break; // awaiting players
        case 1: modalBattleSetup(snapBattle); break; // awaiting squadrons
        case 2: modalBattleDeploy(snapBattle); break; // awaiting deployment
        case 3: modalBattlePlay(snapBattle); break; // awaiting orders
        default: alert('unhandled awaiting state');
      }
    })

  }









  //------------------------- BATTLE SETUP - ADD SQUADRONS MODAL SECTION


  /**
  * Displays the squadron modal to allow adjustment of squadrons that will
  * participate in the battle, including
  * - adding new squadrons,
  * - removing existing squadrons,
  * - adding an AI squadron, and
  * - forming the squadron (creating the ships)
  */
  function modalBattleSetup(snapBattle) {
    const battleId = snapBattle.key;
    const battleEra = snapBattle.val().era;
    const campId = get('campaignId').innerText;
    get('modalSquadBattleId').innerText = battleId;

    // get the latest list of users that will be used to populate the
    // players select/dropdown... a squadron does not have to be commanded
    // (played) by the same person that built it, and can be placed under
    // automatic control (AI).
    dbRootRef.child('Users').once('value', snapUsers => {
      gPlayers = [];
      gPlayers.push(["AI", "AI"]);
      snapUsers.forEach( snapUser => {
        const parts = snapUser.val().name.split(' ');
        const user = [parts[0], snapUser.key]; // array: first-name, key
        gPlayers.push(user); // add this user to the list of players
      });
      gPlayers.sort(); // sort players list by the first name

      // add a list (table) of all squadrons available to fight in this
      // battle, with button on each to add them to the conflict
      dbSquadronsRef.off();
      dbSquadronsRef.on('value', snapSquads => {
        emptyTable('modalSquadAvailable');
        const tbl = get('modalSquadAvailable');
        snapSquads.forEach(snapSquad => {
          if (snapSquad.val().campaign == campId &&
              snapSquad.val().shipCount > 0 &&
              snapSquad.val().battleId == null) {
            const row = tbl.insertRow(-1);

            const cCity = row.insertCell(-1);
            cCity.innerText = snapSquad.val().city;

            const cName = row.insertCell(-1);
            cName.innerHTML = '<i>' + snapSquad.val().title || snapSquad.val().playerName + '</i>';
            cName.playerId = snapSquad.val().playerId; // save as attrib on element

            const cCount = row.insertCell(-1);
            cCount.innerText = snapSquad.val().shipCount + ' ships';

            const cActions = row.insertCell(-1);
            const btn = document.createElement('button');
            btn.id = 'Join|' + snapSquad.key;
            btn.innerHTML = "<i class='fa fa-arrow-up' style='font-size:14px'></i>";
            btn.title = "Join Battle";
            btn.onclick = function() {modalSquadJoin(this);}
            cActions.appendChild(btn);
          }

        })
      })

      show('modalBattleSquads');

      // Setup firebase watchers to keep the squadron table up to date with
      // changes from this page or others working this battle. Gross, just
      // delete and replace all table rows if anything changes.
      dbBattlesRef.child(battleId).off(); // incase already in place
      dbBattlesRef.child(battleId).child('Squadrons').on('value', snapSquads => {
        emptyTable('modalSquadTable');
        modalSquadHeader(battleEra);
        snapSquads.forEach(snapSquad => {
          modalSquadRowAdd(snapSquad.key, battleEra);
          modalSquadChangeRow(snapSquad.key, snapSquad.val());
        });
      });

    });
  }

  /**
  * Adds the era-appropriate header row to the squadrons table on the modal
  */
  function modalSquadHeader(battleEra) {
    const tbl = get('modalSquadTable'); // table of squadrons in the battle
    const row = tbl.insertRow(-1); // add new row to table of squadrons

    const c0 = row.insertCell(0); c0.innerText = 'Player';
    const c1 = row.insertCell(1); c1.innerText = 'Side';
    const c2 = row.insertCell(2); c2.innerText = 'City';

    // add column for each ship type, hide those not used in this era
    const keys = Object.keys(gTypes); // get array of ship names
    for (let i=0; i<keys.length; i++) {
      const cShip = row.insertCell(-1);
      cShip.innerText = keys[i] + 's';
      if (gTypes[keys[i]].era < battleEra) {cShip.style = "display:none";}
    }

    row.insertCell(-1); // for flagship icon
    row.insertCell(-1);  // for review button
  }

  /**
  * Adds an era-appropriate new squadron row to the table on the modal
  */
  function modalSquadRowAdd(squadKey, battleEra) {
    const tbl = get('modalSquadTable'); // table of squadrons
    const row = tbl.insertRow(-1); // add a new row to the table
    row.id = 'Squadron|' + squadKey; // rowId is based on the squadon db key

    // Add dropdown to allow selecting from list of all people or "AI"
    // with each option having the value of the user id and displaying the
    // user's first name.
    const selPlayer = document.createElement('select');
    selPlayer.id = row.id + '|player';
    selPlayer.onchange = function() {modalSquadUpdateValue(this)}
    selPlayer.className = "w3-select";
    for (let i=0; i<gPlayers.length; i++) {
      const opt = createOption(gPlayers[i][1], gPlayers[i][0]);
      selPlayer.add( opt );
    }
    const c0 = row.insertCell(0);
    c0.appendChild(selPlayer);

    // Add number input to allow selecting which side this player is on
    const sideNo = document.createElement('input');
    sideNo.id = row.id + '|side';
    sideNo.onchange = function() {modalSquadUpdateValue(this)}
    sideNo.type = "number";
    sideNo.className = "w3-input";
    sideNo.min = 1;
    sideNo.max = 2;
    const c1 = row.insertCell(1);
    c1.appendChild(sideNo);

    // Column to show which city/nation is fielding this squadron
    const c2 = row.insertCell(2);

    // add column for each ship type used in this era
    const keys = Object.keys(gTypes); // get array of ship types
    for (let i=0; i<keys.length; i++) {
      const cShip = row.insertCell(-1);
      if (gTypes[keys[i]].era < battleEra) {cShip.style = "display:none";}
    }

    // Add  columns for the flagship indicator
    row.insertCell(-1);

    // Add final column for the 'remove squadron' button
    const btn = document.createElement('button');
    btn.id = 'Remove|' + squadKey;
    btn.innerHTML = "<i class='fa fa-arrow-down'></i>";
    btn.title = "Remove Squadron";
    btn.onclick = function() {modalSquadRemove(this);}
    const cBtn = row.insertCell(-1);
    cBtn.appendChild(btn);
  }

  function modalSquadChangeRow(squadKey, squadData) {
    const row = get( 'Squadron|' + squadKey); // rowId is based on the squadon db key
    if (row == null) {alert('Missing squadron on page'); return;}

    // update the player, side and city of this squadron
    row.cells[0].firstChild.value = squadData.player || null;
    row.cells[1].firstChild.value = squadData.side;
    row.cells[2].innerText = squadData.city;

    // add count of each type of ship
    dbShipsRef.orderByChild('squadron').equalTo(squadKey).once('value', snapShips => {
      const keys = Object.keys(gTypes); // get array of ship types
      let sfxFlag = 'o';
      snapShips.forEach(snapShip => { // all ships in this squadron
        if (snapShip.val().state < 3) { // that are not beached, sunk or retired
          for (let i=0; i<keys.length; i++) { // update number of each type
            if (snapShip.val().type == keys[i]) {row.cells[3+i].innerText++;}
          }
          if (snapShip.val().flagship) {sfxFlag = 'checkered';}
        }
      })
      row.cells[3+keys.length].innerHTML = "<i class='fa fa-flag-" + sfxFlag + "' style='font-size:14px'></i>";
    });
  }

  /**
  * Joins a squadron to the battle list
  */
  function modalSquadJoin(btn) {
    const parts = btn.id.split('|'); // format: 'Join|' + squadronId
    const squadronId = parts[1];
    const battleId = get('modalSquadBattleId').innerText;
    const row = btn.parentNode.parentNode;
    const city = row.cells[0].innerText;
    const player = row.cells[1].playerId;

    const cmd = {side: 0, city: city, player: player};
    dbBattlesRef.child(battleId).child('Squadrons').child(squadronId).update(cmd);
    dbSquadronsRef.child(squadronId).update({battleId: battleId});
  }

  /**
  * Removes a squadron from the battle list
  */
  function modalSquadRemove(btn) {
    const parts = btn.id.split('|'); // format: 'Remove|' + squadronId
    const squadronId = parts[1];
    const battleId = get('modalSquadBattleId').innerText;

    dbBattlesRef.child(battleId).child('Squadrons').child(squadronId).remove();
    dbSquadronsRef.child(squadronId).update({battleId: null});
  }

  /**
  * Updates database entry for the displayed squadron with the new value on
  * the given page element... note that page element names are deliberately
  * set to the same as the database attribute name so this routine can be
  * generic.
  */
  function modalSquadUpdateValue(el) {
    const battleId = get('modalSquadBattleId').innerText;

    const parts = el.id.split('|');
    const squadNo = parts[1];
    const attrNm = parts[2];
    const attrVal = (isNaN(el.value)) ? el.value : parseInt(el.value);
    const cmd = {}; cmd[attrNm] = attrVal;

    dbBattlesRef.child(battleId).child('Squadrons').child(squadNo).update(cmd);
  }

  /*
  * Cancels a battle by removing the battle record from the system, first
  * unlinking any assigned squadrons from the battle then deleting the
  * battle entry itself.
  */
  function modalSquadCancel() {
    const battleId = get('modalSquadBattleId').innerText;
    dbBattlesRef.child(battleId).child('Squadrons').once('value', snapBattleSquads => {
      snapBattleSquads.forEach(snapBattleSquad => {
        dbSquadronsRef.child(snapBattleSquad.key).update({battleId: null});
      });
      dbBattlesRef.child(battleId).remove();
      hide('modalBattleSquads');
    })
  }

  /*
  * handles click on the DONE button and triggers a review of the squadrons
  * listed for battle to see if everything is ready.
  */
  function modalSquadCheck() {
    const battleId = get('modalSquadBattleId').innerText;
    reviewStateOfBattle(battleId);
    hide('modalBattleSquads');
  }

  /**
  * Checks each squadron and  adjusts the state of the battle to reflect
  * - each squadron has players: 0 -> 1
  * - has at least 1 squadron on each side + ships in each + flagship: 1 -> 2
  * - all ships have a location: 2 -> 3
  *
  * players -> squadrons -> deployment -> orders -> nothing aka complete
  */
  function reviewStateOfBattle(battleId) {
    dbBattlesRef.child(battleId).child('Squadrons').once('value', snapBattleSquads => {
      console.log('Commencing review of battle squadrons...');
      let squadCount = [0, 0, 0]; // number of squadrons on each side
      let shipCount = [0, 0, 0]; // number of ships on each side
      let flagCount = [0, 0, 0]; // number of flagships on each side
      let playersSet = true; // whether each squadron has a player assigned
      let shipsInThisBattle = 0; // number of ships deployed (with this battleId)

      let squadrons = 0;
      snapBattleSquads.forEach(snapSquad => {squadrons++;});
      console.log('There are', squadrons, 'squadrons to review...');

      let reviewsDone = 0; // keep track of how many squadrons have been reviewed
      snapBattleSquads.forEach(snapSquad => {
        const squadSide = snapSquad.val().side; // which side this squadron is on
        console.log('review squadron from', snapSquad.val().city);
        if (snapSquad.val().player == null) {playersSet = false;}
        squadCount[squadSide]++;

        // Fire off async review to add ships in this squadron to the side counts
        dbShipsRef.orderByChild('squadron').equalTo(snapSquad.key).once('value', snapShips => {
          snapShips.forEach(snapShip => {
            console.log("review ship", snapShip.val().name);
            if (snapShip.val().state < 3) {shipCount[squadSide]++;} // add to number of ships on this side
            if (snapShip.val().flagship) {flagCount[squadSide]++;} // should only be 1 or none per squadron
            if (snapShip.val().battleId == battleId) {shipsInThisBattle++;}
          });

          reviewsDone++; // increment count of squadrons that have been reviewed
          if (reviewsDone >= squadrons) { // last squadron reviewed, can check results
            const haveSquad = (squadCount[0] < 1 && squadCount[1] > 0 && squadCount[2] > 0); // Does each side have at least 1 squadron?
            const haveShips = (shipCount[1] > 0 && shipCount[2] > 0); // Does each side have at least 1 ship?
            const haveFlags = (flagCount[1] >= squadCount[1] && flagCount[2] >= squadCount[2]); // Does each side have flagships matching squadrons?
            const allDeployed = (shipCount[1] + shipCount[2] == shipsInThisBattle); // Are all ships deployed?

            let battleState = 0; // start assuming nothing ie awaiting players
            if (playersSet) {battleState = 1;} // if have players progress to awaiting squadrons
            if (battleState == 1 && haveSquad && haveShips && haveFlags ) {battleState = 2;} // etc
            if (battleState == 2 && allDeployed) {battleState = 3;} // all ships deployed, progress to awaiting orders
            console.log('Results:', haveSquad, haveShips, haveFlags, allDeployed, '=>', battleState);

            dbBattlesRef.child(battleId).update({awaiting: battleState});

            get('modalBattleReviewPlayers').innerHTML = (playersSet) ? gTick: gCross;
            get('modalBattleReviewSquad').innerHTML = (haveSquad) ? gTick: gCross;
            get('modalBattleReviewShips').innerHTML = (haveShips) ? gTick: gCross;
            get('modalBattleReviewFlags').innerHTML = (haveFlags) ? gTick: gCross;
            get('modalBattleReviewDeployed').innerHTML = (allDeployed) ? gTick: gCross;
            show('modalBattleReviewResult');
          }
        })
      });

    });
  }





  //------------------ BATTLE SETUP - DEPLOY SQUADRONS MODAL



  /**
  * Lists the current player's (user's) ships and allows placement on the map
  */
  function modalBattleDeploy(snapBattle) {
    get('modalBattleDeployId').innerText = snapBattle.key; // save battle id on modal
    gnwMarker.removeAll(); // remove any existing markers as they will get rebuilt
    battleSite.setPosition( snapBattle.val().site );
    battleSite.setMap(battleDeployMap);

    // Check that AI squadrons are deployed and, if not, get the AI to deploy them
    gnwAI.deploy(snapBattle.key, battleDeployMap);

    // Build page to allow this user to deploy their ships
    const thisPlayer = get('userName').userId;
    const tbl = get('modalBattleDeployShips');
    emptyTable('modalBattleDeployShips');
    battleDeployMap.setCenter(snapBattle.val().site);
    let mySide = 0; // don't know which side am on until process squadrons

    // Prepare and show text describing the weather.
    const beaufort = snapBattle.val().wind.strength;
    const windDescr = (beaufort < 1)
                    ? "calm"
                    : "a " + gWindTitle[beaufort] + " from the "
                           + gWindDirn[snapBattle.val().wind.direction] + " and "
                           + gWindForecast[snapBattle.val().wind.forecast];
    get('modalBattleDeployWind').innerText = windDescr;

    // Loop through each squadron involved in this battle and, check for any that
    // is being controlled by this player and so list all ships for this player
    // that are in squadrons taking part in this battle. While doing so, build
    // a list of cities on each side so can display the names of the player's foe.
    let sideCities = ['', '', ''];
    snapBattle.child('Squadrons').forEach(snapSquad => {
      sideCities[snapSquad.val().side] += ' ' + snapSquad.val().city;

      if (snapSquad.val().player == thisPlayer) { // this user is contolling this squadron
        mySide = snapSquad.val().side; // note which side the squadron is on
        const squadId = snapSquad.key; // use squadron key to get list of all ships
        dbShipsRef.orderByChild('squadron').equalTo(squadId).once('value', snapShips => {
          snapShips.forEach(snapShip => { // for each ship in the squadron
            const shState = snapShip.val().state;
            if (snapShip.val().state < 3) { // that is not beached, sunk or retired
              const shName = snapShip.val().name;
              const shType = snapShip.val().type;
              if (snapShip.val().battleId == null) { // not yet deployed, list it}
                const row = tbl.insertRow(-1);
                row.draggable = true;
                row.ondragstart = function() {gnw.modalBattleDeployDragStart(event)}
                row.id = snapShip.key;
                row.shipName = shName;
                const c0 = row.insertCell(-1);
                c0.innerHTML = shType + ' <i>' + shName + '</i>';
                if (shState > 1) {c0.innerHTML += ' (' + gShipState[shState] + ')'}

              } else { // already deployed, place a marker
                const shipMarker = gnwMarker.create('ship', shName);
                shipMarker.shipId = snapShip.key; // the marker holds the id of the ship it is marking
                shipMarker.battleId = snapBattle.key; // and the battle it is part of
                shipMarker.setPosition( snapShip.val().location );
                gnwMarker.register(shipMarker, battleDeployMap); // place on map and register
              }
            }
          })
        });
      }
    });

    // now place a list of enemy cities on the page
    const otherSide = (mySide == 1) ? 2: 1;
    get('modalBattleDeployEnemyCities').innerText = textArrayToAndString(sideCities[otherSide]);

    show('modalBattleDeploy');
  }

  /**
  * Cancels deployment and returns deployed ships to available by
  * - Changing awaiting state of battle back to awaiting squadrons;
  * - Remove the battleId from any ships already deployed;
  */
  function modalBattleDeployCancel() {
    const battleId = get('modalBattleDeployId').innerText;
    dbBattlesRef.child(battleId).update({awaiting: 1});

    dbShipsRef.orderByChild('battleId').equalTo(battleId).once('value', snapShips => {
      snapShips.forEach(snapShip => {
        dbShipsRef.child(snapShip.key).update({battleId: null});
      });
    });

    hide('modalBattleDeploy');
  }

  /*
  * Handles drag/drop events to drag a ship off the available-ships table
  * and drop it onto the deploy-map.
  */
  function modalBattleDeployDragStart(ev) {
    ev.dataTransfer.setData("text", ev.target.id + '|' + ev.target.shipName);
  }
  function modalBattleDeployDragOver(ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  function modalBattleDeployDragDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    const parts = ev.dataTransfer.getData("text").split('|'); // shipId | shipName
    const pointDropped = {x:ev.offsetX, y:ev.offsetY};
    const dropLatLng = point2LatLng(pointDropped, battleDeployMap);

    // make a trireme shaped marker to represent this ship
    const shipMarker = gnwMarker.create('ship', parts[1]);
    shipMarker.shipId = parts[0]; // the marker holds the id of the ship it is marking
    shipMarker.battleId = get('modalBattleDeployId').innerText; // and the battle it is part of

    // place it on the map at the specified location
    gnwMarker.place(shipMarker, dropLatLng, battleDeployMap, modalBattleDeployShipPlaced);

    return false; // to prevent drop event bubbling further
  }

  // Converts drop X,Y screen point to google map lat,lng. Requires the offsetX
  // and offsetY values from the drop event as these give the offset into the
  // map container.  From 'Egil' on StackOverflow:
  // how-to-convert-from-x-y-screen-coordinates-to-latlng-google-maps
  function point2LatLng(point, map) {
    var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    var scale = Math.pow(2, map.getZoom());
    var worldPoint = new google.maps.Point(point.x / scale + bottomLeft.x, point.y / scale + topRight.y);
    return map.getProjection().fromPointToLatLng(worldPoint);
  }

  /*
  * Tidies up after a ship has been deployed... called from the gnwMarker
  * place function after a successful placement
  */
  function modalBattleDeployShipPlaced(marker) {
    if (marker.position == null) {return;} // not able to be placed (on land?)

    // Add the marker for this floating ship to the register
    gnwMarker.register(marker, battleDeployMap);

    // hide that ship on the waiting-for-deployment list on the left and flag
    // the ship's database entry with the battleId to indicate that it has been
    // deployed plus it's current location
    hide(marker.shipId);
    const ll = {lat: marker.position.lat(), lng: marker.position.lng()};
    dbShipsRef.child(marker.shipId).update({battleId: marker.battleId, location: ll});
  }

  /*
  * Handles a player declaring their deployment done... if this is the last
  * non-AI player then deploy the AI ships and let the battle commence
  */
  function modalBattleDeployDone() {
    const battleId = get('modalBattleDeployId').innerText;
    reviewStateOfBattle(battleId);
    hide('modalBattleDeploy');
  }





  //------------------ BATTLE - CONDUCT A BATTLE TURN



  /**
  *
  */
  function modalBattlePlay(snapBattle) {
    const battleId = snapBattle.key;
    const snapSquads = snapBattle.child('Squadrons');
    get('modalBattlePlayId').innerText = battleId; // save battle id on modal
    gnwMarker.removeAll(); // remove any existing markers as they will get rebuilt
    emptyTable('modalBattlePlayLog');
    emptyNode('modalBattlePlaySideCards1');
    emptyNode('modalBattlePlaySideCards2');
    let mySide = 0; // set from Squadrons under my control, below

    // set the battle map and callback function to be used by gnwShips card clicks
    gnwShip.setMap(battleTurnMap, modalBattlePlayOrdersPrompt);

    // Build page to allow this user to order their ships
    const thisPlayer = get('userName').userId;
    battleTurnMap.setCenter(snapBattle.val().site);

    // Loop through each squadron involved in this battle and place a list of
    // combatant cities on the page
    let sideCities = ['', '', ''];
    snapBattle.child('Squadrons').forEach(snapSquad => {
      if (snapSquad.val().player == thisPlayer) {mySide = snapSquad.val().side;}
      sideCities[snapSquad.val().side] += ' ' + snapSquad.val().city;
    });
    get('modalBattlePlaySideCities1').innerText = textArrayToAndString(sideCities[1]);
    get('modalBattlePlaySideCities2').innerText = textArrayToAndString(sideCities[2]);

    // Establish watcher to monitor the battle and update the page turn,
    // weather and event log if the turn has changed
    dbBattlesRef.child(battleId).off();
    let turnTracker = -1; // trigger header and log update
    dbBattlesRef.child(battleId).on('value', snapBattleChange => {
      if (snapBattleChange.val().turn != turnTracker) {
        turnTracker = snapBattleChange.val().turn;
        modalBattlePlayHeader(snapBattleChange);
        emptyTable('modalBattlePlayLog');
        snapBattleChange.child('Log').forEach(snapLog => {
          const logVal = snapLog.val();
          if (logVal.turn >= (turnTracker - 1)) { // only show events for last turn
            modalBattlePlayLogShow(logVal.ship, logVal.event, logVal.extra);
          }
        });
      }
    });

    // Establish watcher to monitor the state of each ship in this battle and
    // update the cards and map to reflect any changes
    dbShipsRef.orderByChild('battleId').equalTo(battleId).off();
    dbShipsRef.orderByChild('battleId').equalTo(battleId).on('child_added', snapShip => {
      const squadId = snapShip.val().squadron;
      const city = snapShip.val().city;
      const shipNm = snapShip.val().name;
      const shipType = snapShip.val().type;
      const shipSide = snapBattle.child('Squadrons').child(squadId).val().side;
      const shipColour = (shipSide == mySide) ? 'blue': 'red';

      // place trireme marker on map, pointing in direction given by ship heading
      const iconNm = (snapShip.val().health.sunk) ? 'swim': 'trireme';
      const marker = gnwMarker.create(iconNm, shipNm, snapShip.val().heading || 0,
                                       shipColour, 0.8);
      marker.shipId = snapShip.key;
      marker.setPosition(snapShip.val().location);
      gnwMarker.register(marker, battleTurnMap);
      gnwMarker.addClickCallback(snapShip.key, modalBattlePlayOrdersPrompt);

      // build info card and place on page
      const cardSet = get('modalBattlePlaySideCards' + shipSide);
      cardSet.appendChild( gnwShip.newCard(snapShip, gTypes) );
      gnwShip.updateCard(snapShip, gTypes);
    });

    dbShipsRef.orderByChild('battleId').equalTo(battleId).on('child_changed', snapShip => {
      gnwShip.updateCard(snapShip, gTypes);
      gnwMarker.newLocation(snapShip.key, snapShip.val().heading, snapShip.val().location);
      if (snapShip.val().health.sunk) {} // TODO
    });

    // And establish a watcher to place breadcrumb images on the map to
    // indicate the wake / history of each ship
    dbCrumbsRef.orderByChild('battleId').equalTo(battleId).off();
    dbCrumbsRef.orderByChild('battleId').equalTo(battleId).on('child_added', snapCrumb => {
      const currTurn = get('modalBattlePlayTurn').innerText;
      if (snapCrumb.val().turn > currTurn - 5) { // only show last 5 turns
        const crumb = gnwMarker.create(snapCrumb.val().type,
                                       snapCrumb.val().title,
                                       snapCrumb.val().heading,
                                       'grey', 0.2);
        crumb.setPosition(snapCrumb.val().location);
        gnwMarker.register(crumb, battleTurnMap);
      }
    })

    show('modalBattlePlay');
  }

  function modalBattlePlayHeader(snapBattle) {
    get('modalBattlePlayYear').innerText = "~" + snapBattle.val().era;
    get('modalBattlePlayTurn').innerText = snapBattle.val().turn;

    // Prepare and show text describing the weather.
    const beaufort = snapBattle.val().wind.strength;
    const windDescr = (beaufort < 1)
                    ? "calm"
                    : "a " + gWindTitle[beaufort] + " from the "
                           + gWindDirn[snapBattle.val().wind.direction] + " and "
                           + gWindForecast[snapBattle.val().wind.forecast];
    get('modalBattlePlayWind').innerText = windDescr;
  }

  /**
  * Shows a log entry on the page, Adds a log entry to the battle's log
  */
  function modalBattlePlayLogShow(ship, event, extra=null) {
    const tbl = get('modalBattlePlayLog');
    const row = tbl.insertRow(-1); row.className = "w3-small";
    const cShip = row.insertCell(-1); cShip.innerText = ship;
    const cEvent = row.insertCell(-1); cEvent.innerText = event;
    if (extra != null) {row.title = extra;}
  }

  function modalBattlePlayLogAdd(battleId, shipNm, turnNo, eventDesc, extraNote) {
    const cmd = {ship: shipNm, turn: turnNo, event: eventDesc, extra: extraNote};
    dbBattlesRef.child(battleId).child('Log').push(cmd);
  }

  /*
  * Prepares and shows prompt to get orders for a ship on the next turn. have
  * to get the latest from the database so can show any existing orders
  */
  function modalBattlePlayOrdersPrompt(shipId) {
    // If the orders card is visible then there may be unsaved orders so...
    const currDisp = get('modalBattlePlayOrders').style.display;
    if (currDisp == 'block') {modalBattlePlayOrdersDone();}

    // Get any current orders, populate orders card and show it
    dbShipsRef.child(shipId).once('value', snapShip => {
      const shipVal = snapShip.val();
      get('modalBattlePlayOrdersShipId').innerText = shipId;
      get('modalBattlePlayOrdersShipNm').innerText = shipVal.name;

      // clear orders card, to remove any orders from earlier ships
      const elOrders = get('modalBattlePlayOrdersSequence');
      for (let i=0; i<5; i++) {elOrders.children[i].innerText = '';}

      if (shipVal.orders != null) {
        for (let i=0; i<5; i++) {elOrders.children[i].innerText = shipVal.orders[i];}
      }

      // Survivors-in-water orders card if the ship is sunk, otherwise ship card
      if (shipVal.health.sunk) {
        const crew = shipVal.health.crew;
        const noRemaining = crew.archers + crew.marines + crew.sailors
                          + shipVal.health.port.oars
                          + shipVal.health.starboard.oars;

        if (noRemaining > 0) { // if all lost, don't show orders prompt
          hide('modalBattlePlayOrdersAfloat');
          show('modalBattlePlayOrdersSunk');
          hide('modalBattlePlayLogDiv'); // so there is space for the orders card
          show('modalBattlePlayOrders');
        }

      } else {
        show('modalBattlePlayOrdersAfloat');
        hide('modalBattlePlayOrdersSunk')
        hide('modalBattlePlayLogDiv');
        show('modalBattlePlayOrders');
      }

    });
  }

  /*
  * Saves the orders for a ship on the next turn
  */
  function modalBattlePlayOrdersDone() {
    const shipId = get('modalBattlePlayOrdersShipId').innerText;
    const elOrders = get('modalBattlePlayOrdersSequence');

    // Build order object from the list of span elements on the page
    const orders = [];
    for (let iPart = 0; iPart<5; iPart++) {
      orders[iPart] = elOrders.children[iPart].innerText;
    }

    // Save order to database
    dbShipsRef.child(shipId).update({ orders: orders });

    hide('modalBattlePlayOrders');
    show('modalBattlePlayLogDiv');
  }

  /**
  * Cancels battle and returns deployed ships to available by
  * - Changing awaiting state of battle back to awaiting squadrons;
  * - Remove the battleId from any ships already deployed;
  */
  function modalBattlePlayCancel() {
    const battleId = get('modalBattlePlayId').innerText;

    gnwMarker.removeAll(); // remove any existing markers on the map
    // turn off listeners so they wont be triggered by following updates
    dbShipsRef.orderByChild('battleId').equalTo(battleId).off();

    dbBattlesRef.child(battleId).update({awaiting: 1});

    dbShipsRef.orderByChild('battleId').equalTo(battleId).once('value', snapShips => {
      snapShips.forEach(snapShip => {
        dbShipsRef.child(snapShip.key).update({battleId: null});
      });
    });

    hide('modalBattlePlay');
    hide('modalBattleCancelPrompt');
  }

  /**
  * Handles 'NEXT' button: checks whether all players are done making orders
  * and, if so, triggers processing of a turn
  */
  function modalBattlePlayNext() {
    // TODO check that all players have hit 'NEXT'

    // TODO AI places orders for AI controleld ships

    modalBattleTurn();
  }

  /**
  * Runs through the steps of a turn, per Greek Naval Warfare rules, applying
  * orders and working out consequences of movement, ramming, etc. Sequence is
  * 1. Wind change
  * 2. Hole plugging & survivors in water
  * 3. Write orders
  * 4. Movement
  * 5. Oar and crew transfers
  * 6. Archery
  * 7. Oar raking results
  * 8. ramming results
  * 9. Grappling and backwatering
  * 10. Boarding results
  * 11. Morale
  */
  function modalBattleTurn() {
    // Get current battle settings, eg current wind
    const battleId = get('modalBattlePlayId').innerText;
    dbBattlesRef.child(battleId).once('value', snapBattle => {
      let thisTurn = snapBattle.val().turn;
      console.log('>>>>> TURN', thisTurn);

      // Get list of ships in battle so can process the list over and over as
      // work through the turn sequence...
      const battleId = get('modalBattlePlayId').innerText;
      dbShipsRef.orderByChild('battleId').equalTo(battleId).once('value', snapShips => {
        const remember = {}; // some things have to be remembered between phases
        // and the ships snapShot is static ie any changes within the turn
        // will not reflect in the snapShot. So, get last settings from database
        // before start the phase loop and track them in the 'remember' object
        snapShips.forEach(snapShip => {
          remember[snapShip.key] = {delayCountdown: snapShip.val().delayCountdown || 0,
                                    heading: snapShip.val().heading || 0,
                                    currPoint: [snapShip.val().location.lng,
                                                snapShip.val().location.lat]};
        });

        // 4. MOVEMENT, breaks turn (1min) into 5 phases... want to process
        // movement as simultaneously as can so loop through the phases
        console.log(thisTurn, 'MOVEMENT...');
        for (let iPhase=0; iPhase<5; iPhase++) {
          snapShips.forEach(snapShip => {
            const shipId = snapShip.key;
            const shipVal = snapShip.val();
            const currRowing = shipVal.rowing; // can only be changed once per turn, no need to lookup again
            const exhausted = (shipVal.health.fullSpeeds <= 0); // no full speeds left
            const sailing = (shipVal.sailing != null); // under sail

            // current heading is the last one recorded within this turn
            const currHeading = remember[shipId].heading;

            // move vessel according to current speed, first work out the current
            // speed (in game speed units) whether the ship is sailing or rowing.
            const currSpeed = (sailing)
                            ? modalBattleTurnSailingSpeed(snapBattle, snapShip)
                            : modalBattleTurnRowingSpeed(snapBattle, snapShip);
            if (currSpeed != 0) { // it is moving, so...
              // get current location in ruler format from last phase or
              // the database value at start of turn if not yet remembered
              const currPoint = remember[shipId].currPoint;
              // before moving ship away from this point, place a breadcrumb
              // marker on the map so the ship's wake (history) is visualised
              const crumbCmd = {type: 'trireme',
                                turn: thisTurn,
                                title: shipVal.name + thisTurn + '.' + iPhase,
                                heading: currHeading,
                                location: {lat: currPoint[1], lng: currPoint[0]},
                                battleId: battleId };
              dbCrumbsRef.push(crumbCmd);
              // calculate distance travelled this phase ie current game
              // speed -> knts -> kph -> m/hr -> m/phase (5 phases per turn/minute)
              const currDist = Math.round(currSpeed * 2 * 1.85 * 1000 / 60 / 5);
              // use geo ruler to calculate the position after movement
              const nextPoint = gRuler.destination(currPoint, currDist, currHeading);
              // convert back to lat/lng and save, which will result in the ship
              // marker being moved on all listening pages
              const nextLL = {lat: nextPoint[1], lng: nextPoint[0]};
              gnwShip.adjust(shipId, 'location', nextLL);
              remember[shipId].currPoint = nextPoint;
              // decrement countdown of moves since last turn, for turning circle
              remember[shipId].delayCountdown = remember[shipId].delayCountdown - 1;
            }

            // adjust rowing speed, if so ordered
            const orders = shipVal.orders;
            if (orders != null && !sailing) { // ship not sailing and has some orders
              const order = orders[iPhase]; // get order for this phase

              if (order == '+' && currRowing < 2) { // increase rowing
                gnwShip.adjust(shipId, 'rowing', currRowing + 1);
              }

              if (order == '+' && currRowing == 2 && !exhausted) { // ramming speed
                gnwShip.adjust(shipId, 'rowing', currRowing + 1);
              }

              if (order == '-' && currRowing > -1) { // slow rowing
                gnwShip.adjust(shipId, 'rowing', currRowing - 1);
              }
            }


            // a ship can steer if it is moving and has either oars on both side or a rudder
            // and has travelled far enough since the last heading change
            const oars = shipVal.health.port.oars > 0 && shipVal.health.starboard.oars > 0;
            const rudder = shipVal.health.port.rudder > 0 || shipVal.health.starboard.rudder > 0;
            const farEnough = (remember[shipId].delayCountdown <= 0);
            const steerable = (currSpeed != 0 && (oars || rudder) && farEnough);

            if (orders != null && steerable) {
              const order = orders[iPhase]; // get order for this phase

              if (order == 'P') { // Port
                // if moving forward heading changes to port, backward to starboard
                const mFwdBack = (currSpeed < 0) ? -1: +1;
                // calculate new heading and both save to database plus remember
                // for later in this turn
                const newHeading = calcHeading(currHeading, -1 * mFwdBack);
                gnwShip.adjust(shipId, 'heading', newHeading);
                remember[shipId].heading = newHeading;
                remember[shipId].delayCountdown = modalBattleTurnDelay(shipVal.type, currSpeed);
              }

              if (order == 'S') { // Starboard
                // if moving forward heading changes to starboard, backward to port
                const mFwdBack = (currSpeed < 0) ? -1: +1;
                // calculate new heading...
                const newHeading = calcHeading(currHeading, +1 * mFwdBack);
                gnwShip.adjust(shipId, 'heading', newHeading);
                remember[shipId].heading = newHeading;
                remember[shipId].delayCountdown = modalBattleTurnDelay(shipVal.type, currSpeed);
              }
            }
          });
        }

        // 5. TRANSFERS, for stationary ships
        console.log(thisTurn, 'TRANSFERS...');
        snapShips.forEach(snapShip => {
          const shipId = snapShip.key;
          const shipVal = snapShip.val();
          const sailing = (shipVal.sailing != null); // under sail
          const currSpeed = (sailing)
                          ? modalBattleTurnSailingSpeed(snapBattle, snapShip)
                          : modalBattleTurnRowingSpeed(snapBattle, snapShip);
          if (currSpeed == 0) {
            for (let iPhase=0; iPhase<5; iPhase++) { // check orders
              if (shipVal. orders != null && shipVal. orders[iPhase] == 'T') { // have order to transfer
                const portOars = shipVal.health.port.oars;
                const starOars = shipVal.health.starboard.oars;
                if (portOars <= 0 && starOars > 1) {
                  gnwShip.adjust(shipId, 'health/port/oars', 1);
                  gnwShip.adjust(shipId, 'health/starboard/oars', starOars - 1);
                  gnwShip.adjust(shipId, 'rowing', 0);
                }
                if (starOars <= 0 && portOars > 1) {
                  gnwShip.adjust(shipId, 'health/starboard/oars', 1);
                  gnwShip.adjust(shipId, 'health/port/oars', portOars - 1);
                  gnwShip.adjust(shipId, 'rowing', 0);
                }
                break; // only 1 transfer per turn
              }
            }
          }
        });

        // 6-8. ARCHERY, RAKING & RAMMING RESULTS
        console.log(thisTurn, 'RESULTS...');

        // 9. GRAPPLING & BACKWATERING
        console.log(thisTurn, 'RESULTS...');

        // 10. BOARDING RESULTS
        console.log(thisTurn, 'BOARDING...');

        // 11. MORALE
        console.log(thisTurn, 'MORALE...');

        // END OF TURN, START NEXT TURN
        thisTurn++;

        // 1. WIND CHANGE
        let newWind = modalBattleTurnWindChange(snapBattle.val().wind);
        console.log(thisTurn, 'WIND CHANGE');

        // 2. HOLD PLUGGING and SURVIVORS IN WATER
        console.log(thisTurn, 'HOLE PLUGGING...');
        snapShips.forEach(snapShip => {
          const shipId = snapShip.key;
          const holes = snapShip.val().health.holes;
          if (holes > 0) { // ship has a hole
           // Crew tries to plug hole, 1 in 6 chance... if fail then ship hull
           // takes further damage.
           if (D(6) == 1) { // plugged!
             gnwShip.adjust(shipId, 'health/holes', holes - 1);
             modalBattlePlayLogAdd(battleId, snapShip.val().name, thisTurn, 'hole plugged', '');

           } else { // hole remains, ship hull loses a point
             const hullHealth = snapShip.val().health.hull;
             gnwShip.adjust(shipId, 'health/hull', hullHealth - 1);
             modalBattlePlayLogAdd(battleId, snapShip.val().name, thisTurn, 'plug failed', '');
             if (hullHealth - 1 <= 0) {
               // TODO is it grappled to a larger ship?
               modalBattlePlayLogAdd(battleId, snapShip.val().name, thisTurn, 'SUNK!', '');
               gnwShip.adjust(shipId, 'health/sunk', true);
               modalBattleTurnSurvivorsInWater(shipId);
             }
           }
         }

         if (snapShip.val().health.sunk) {modalBattleTurnSurvivorsInWater(shipId);}

        });

        // Update battle record to reflect changed wind and the next turn
        // and clear the previous set of orders ready for the next set and
        // save the delayCountdown.
        dbBattlesRef.child(battleId).update({wind: newWind, turn: thisTurn});
        snapShips.forEach(snapShip => {
          const cmd = {orders: null, delayCountdown: remember[snapShip.key].delayCountdown};
          dbShipsRef.child(snapShip.key).update(cmd);
        })

      }); // end of asynch get of ships in battle
    }); // end of asynch get of battle details
  }

  /*
  * Returns a new heading given an existing heading and a change direction
  * All changes are by 45 degrees ie one compass point.
  */
  function calcHeading(heading, dirn) {
    const chng = dirn * 45;
    let newH = heading + chng;
    if (newH == -45) {newH = 315;}
    if (newH == 360) {newH = 0;}
    return newH;
  };

  /*
  * checks for survivors in the water drowning
  */
  function modalBattleTurnSurvivorsInWater(shipId) {
    // survivors overboard... get latest crew numbers from database
    dbShipsRef.child(shipId).once('value', snapShip => {
      const health = snapShip.val().health;

      // get the types of crew and check each type for numbers. All remaining
      // are considered as being in the water and may drown
      const crewKeys = Object.keys(health.crew);

      for (let i=0; i<crewKeys.length; i++) {
        let noRemaining = health.crew[crewKeys[i]];
        if (noRemaining > 0 && snapShip.val().health.sunk) {
          modalBattleTurnSurvivorsInWaterCheck(noRemaining,
                    'health/crew/' + crewKeys[i], crewKeys[i], snapShip);
        }
      }

      if (health.port.oars > 0 && snapShip.val().health.sunk) {
        modalBattleTurnSurvivorsInWaterCheck(health.port.oars,
                  'health/port/oars', 'port rowers', snapShip);
      }

      if (health.starboard.oars > 0 && snapShip.val().health.sunk) {
        modalBattleTurnSurvivorsInWaterCheck(health.starboard.oars,
                  'health/starboard/oars', 'starboard rowers', snapShip);
      }

    });
  }

  function modalBattleTurnSurvivorsInWaterCheck(noInWater, path, crewType, snapShip) {
    const thisTurn = get('modalBattlePlayTurn').innerText;
    let noRemaining = noInWater;

    for (let j=0; j<noInWater; j++) {
      if ( D(6) == 1) { // drowned
        noRemaining--;
        gnwShip.adjust(snapShip.key, path, noRemaining);
      }
    }

    if (noRemaining < noInWater) { // some drowned
      const noLost = noInWater - noRemaining;
      const msg = noLost + ' ' + crewType + ' drowned';
      modalBattlePlayLogAdd(snapShip.val().battleId, snapShip.val().name, thisTurn, msg, '');
    }
  }

  /*
  * Uses the ship type and current speed to return the delay required before
  * the next turn is allowed
  */
  function modalBattleTurnDelay(shipType, currSpeed) {
    // lookup the delay between heading changes allowed for this ship
    // type at this speed... incase it needs to be
    let turnDelay = gTypes[shipType].turnDelay.slow;
    if (currSpeed > 1) turnDelay = gTypes[shipType].turnDelay.cruise;
    if (currSpeed > 2) turnDelay = gTypes[shipType].turnDelay.full;

    return turnDelay + 1; // +1 so that the very next move doesn't wipe it out
  }

  /*
  * Uses the ship type and rowing pace to work out ship speed.
  */
  function modalBattleTurnRowingSpeed(snapBattle, snapShip) {
    const shipType = snapShip.val().type;
    let shipRowing = snapShip.val().rowing;
    const wind = snapBattle.val().wind.strength;
    const crippled = false; // TODO

    // Weather impact: no rowing at fresh breeze or higher, and
    // crippled ships limited to slow at gentle breeze or higher.
    if (wind >= 3 && crippled & shipRowing > 1) {shipRowing = 1;}
    if (wind >= 5) {return 0;}

    // Health impact, must have at least one set of oars on each side
    const health = snapShip.val().health;
    if (health.port.oars < 1 || health.starboard.oars < 1) {return 0;}

    // Speed if not crippled and rowing, based on ship type
    if (!crippled && shipRowing < 0) {return gTypes[shipType].speed.slow * -1};
    if (!crippled && shipRowing == 1) {return gTypes[shipType].speed.slow;}
    if (!crippled && shipRowing == 2) {return gTypes[shipType].speed.cruise;}
    if (!crippled && shipRowing > 2) {return gTypes[shipType].speed.full;}

    // speed if crippled but still rowing, based on ship type
    if (crippled && shipRowing < 0) {return gTypes[shipType].crippled.slow * -1};
    if (crippled && shipRowing == 1) {return gTypes[shipType].crippled.slow;}
    if (crippled && shipRowing == 2) {return gTypes[shipType].crippled.cruise;}
    if (crippled && shipRowing > 2) {return gTypes[shipType].crippled.full;}

    // otherwise, no speed eg rowing pace is set to STOP
    return 0;
  }

  /*
  * checks the wind and uses the ship type and angle-to-the-wind to work out
  * the sailing speed.
  */
  function modalBattleTurnSailingSpeed(snapBattle, snapShip) {
    if (snapShip.val().sailing == null) {return 0;} // not sailing

    // TODO

    return 2;
  }

  function modalBattleTurnWindChange(prevWind) {
    let dirn = prevWind.direction;
    let fcst = prevWind.forecast;
    let str = prevWind.strength;

    // Roll to see if wind changes...
    if ( D(52) <= 52 ) { // any ace in card deck => wind change
      const rollChange = D(52);
      if (rollChange == 1) {dirn = (dirn + 1) % 8; // wind veers east
      } else if (rollChange == 2) {dirn = (dirn - 1) % 8; // wind veers west
      } else if (rollChange == 3) {if (str > 0) {str--;}
      } else if (rollChange == 4) {str++;}
    }
    return {direction: dirn, forecast: fcst, strength: str}
  }


//-----------------------------------------------------------
// expose wrapped functions that get called from the HTML
return {battleAction: battleAction,
        cardChange: cardChange,
        modalBattleDeployCancel: modalBattleDeployCancel,
        modalBattleDeployDone: modalBattleDeployDone,
        modalBattleDeployDragStart: modalBattleDeployDragStart,
        modalBattleDeployDragOver: modalBattleDeployDragOver,
        modalBattleDeployDragDrop: modalBattleDeployDragDrop,
        modalBattleDeployShipPlaced: modalBattleDeployShipPlaced,
        modalBattlePlay: modalBattlePlay,
        modalBattlePlayCancel: modalBattlePlayCancel,
        modalBattlePlayNext: modalBattlePlayNext,
        modalBattlePlayOrdersDone: modalBattlePlayOrdersDone,
        modalBattlePlayOrdersPrompt: modalBattlePlayOrdersPrompt,
        modalCampPick: modalCampPick,
        modalCampPickNew: modalCampPickNew,
        modalMngSquadBuild: modalMngSquadBuild,
        modalMngSquadChangeCity: modalMngSquadChangeCity,
        modalMngSquadChangeTitle: modalMngSquadChangeTitle,
        modalMngSquadFlagSelected: modalMngSquadFlagSelected,
        modalMngSquadShipAction: modalMngSquadShipAction,
        modalNewBattle: modalNewBattle,
        modalNewEraSelected: modalNewEraSelected,
        modalNewSave: modalNewSave,
        modalNewSquadron: modalNewSquadron,
        modalSquadCancel: modalSquadCancel,
        modalSquadCheck: modalSquadCheck,
        modalSquadJoin: modalSquadJoin,
        modalSquadRemove: modalSquadRemove,
        squadronAction: squadronAction}

} (); // // end and immediately execute the ananymous wrapper
