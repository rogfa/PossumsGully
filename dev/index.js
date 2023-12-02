/**
 * @file holds scripts used in the index page.
 * Runs once firebaseAuth.js has confirmed user access.
 * Part of the possums gully web application.
 * @author Rod Hawkes
 */
'use strict';
// Wrap everything in an anonymous function so that all function names and
// global variables are kept local to this js and can't be accidently
// overridden by other js code
const pgIndex = function() {
  let gSites = []; // list of sites available, populated by listener.
  let /** number */ gSiteNo = 0; // array no of currently viewed site
  let /** string */ gSiteId = ''; // database id of currently viewed site
  let /** number */ gToDo = 0; // number of outstanding TODO notes
  let /** Object */ dbBookingsRef = null; // database reference to current site's bookings
  let /** Object */ dbChecklistsRef = null; // database reference to current site's Checklists
  let /** Object */ dbNotesRef = null; // database reference to current site's notes
  let /** Object */ dbStoriesRef = null; // database reference to current site's stories list
  const /** Object */ gParams = new URLSearchParams(document.location.search); // get the invoking parameters

  // in all pages, set a document level lsitener for a click not on a button
  // (because we don't want to process a click on the menu stack button) and, if
  // detected and the menu sidebar is open, close the sidebar
  document.addEventListener("click", function(e) {
    const /** HTMLElement */ elSide = get('sideMenu');
    if (elSide == null) {return;}
    const /** string */ disp = elSide.style.display;
    const /** string */ tagN = e.srcElement.tagName;
    if(tagN != 'BUTTON' && disp == 'block') {elSide.style = "display:none";}
  });

  // when the database is connected and the user authorised...
  document.addEventListener("pgUserAuthorised", function(e) {
    // enable admin options for admin user 
    if (get('userName').innerText == 'Rod Hawkes') { // TODO admin type user on database
      show('menuAddSite');
      console.log('enabling admin menu item');
    } else {
      hide('menuAddSite');
    }

    // makes listener for changes to Settings and, for each change, completely
    // resets the global site variables.
    dbRootRef.child('Settings').on('value', snap => {
      gSites = []; // reset the site list
      gSiteId = null;
      const /** string */ urlSiteId = gParams.get('siteId');
      let /** number */ ctr = 0;
      snap.forEach(snapSetting => { // add entry for each site
        let cmd = snapSetting.val();
        cmd.id = snapSetting.key;
        gSites.push( cmd );
        if (cmd.id == urlSiteId) {gSiteId = cmd.id; gSiteNo = ctr;}
        ctr++;
      });

      if (gSiteId == null) { // if no site specified on URL...
        if (gSites.length == 1) { // only one site, that must be the viewed one
          gSiteNo = 0;
          gSiteId = gSites[0].id;
        } else { // multiple sites, TODO prompt for one to view
          console.error('no code to prompt for multiple sites!!!');
          gSiteNo = 0;
          gSiteId = gSites[0].id;
        }
      }
      changeSite();
    });
  }); // end pgUserAuthorised event

  // changes the site being viewed, assuming new siteId is in global gSiteId
  function changeSite() {
    console.log('change to site', gSites[gSiteNo])
    set('siteName', gSites[gSiteNo].siteName);
    document.title = gSites[gSiteNo].siteName;
    dbBookingsRef = dbRootRef.child('Bookings').child(gSiteId);
    dbChecklistsRef = dbRootRef.child('Checklists').child(gSiteId);
    dbNotesRef = dbRootRef.child('Notes').child(gSiteId);
    dbStoriesRef = dbRootRef.child('Stories').child(gSiteId);

    // and notify the stories upload modal of the new site id as that becomes
    // the path for files to be stored under
    modalUpload.changePath(gSiteId);

    // build the calendar for today's month and throws 'built' event when done
    rjhCalendar.buildCalendar( new Date() );

    // enable the buttons
    show('btnAddBooking', 'inline-block');
    show('btnGuestBook', 'inline-block');
    show('btnStories', 'inline-block');
  }



  // when the calendar js signals a rebuilt, repopulate with bookings
  document.addEventListener("rjhCalendarBuilt", function(e) {
    if (dbBookingsRef == null) {return;} // dbase not yet connected
    console.log('rjhCalendarBuilt');

    // empty the page table of bookings
    const /** number */ nRows = get('tBookings').rows.length;
    for (let i=nRows-1; i>=0; i--) {get('tBookings').deleteRow(i);}

    // populate then keep listening
    dbBookingsRef.off();
    dbBookingsRef.on('child_added', snap => {
      addBookingToPage(snap);
    });

    dbBookingsRef.on('child_removed', snap => {
      rjhCalendar.buildCalendar();
    });

    dbBookingsRef.on('child_changed', snap => {
      rjhCalendar.buildCalendar(); // just rebuild the lot
    });

    // establish the same listeners for the Notes... these will build
    // and maintain the Guest Book modal, which may never get displayed,
    // but will also keep the TODO badge up to date on the main page.
    modalNotesInit();

  });




  //----------------------- common routines
  // Get the the specified element on the page
  function get(elementId) {
    return document.getElementById(elementId);
  }

  // Get the the value specified element on the page as a Date
  function getDate(elementId) {
    const /** HTMLElement */ el = document.getElementById(elementId);
    const /** Date */ elDate = Date.parse(el.value);
    return elDate;
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






  //-----------------------  BOOKINGS
  function addBookingToPage(snapBooking) {
    const /** Date */ date = new Date(snapBooking.val().arriving);
    const /** string */ departing = snapBooking.val().departing;

    // default the booking listing to whatever the setting is for the site or, if 
    // there is no setting, to just showing the current month's bookings.
    let /** boolean */ bVisible = gSites[gSiteNo].showAllBookings || false;
    while (rjhCalendar.getYYYYMMDD(date) <= departing) {
      const /** HTMLElement */ el = get( rjhCalendar.getYYYYMMDD(date) );
      if (el != null) { // this day of the booking is on the visible calendar...
        el.classList.add("w3-blue"); // make calendar day blue to indicate booked
        el.onclick = function() {modalModBookingInit(snapBooking.key);}
        bVisible = true;
      }

      date.setDate(date.getDate() + 1);
    }

    if (bVisible) { // this booking is visible on the calendar, list it too..
      const /** HTMLElement */ tRow = get('tBookings').insertRow(-1);
      tRow.id = snapBooking.key;
      tRow.className = "w3-small";
      tRow.onclick = function() {modalModBookingInit(snapBooking.key);}
      const /** HTMLElement */ cSort = tRow.insertCell(0);
      const /** HTMLElement */ cGuests = tRow.insertCell(1);
      const /** HTMLElement */ cArriving = tRow.insertCell(2);
      const /** HTMLElement */ cDays = tRow.insertCell(3);
      const /** HTMLElement */ cBin = tRow.insertCell(4);

      cSort.innerText = rjhCalendar.getYYYYMMDD( new Date(snapBooking.val().arriving) );
      cSort.style.display = "none";

      cGuests.innerText = decodeURIComponent(snapBooking.val().guests);

      const /** Date */ arriving = new Date(snapBooking.val().arriving);
      const /** Array<string> */ parts = arriving.toString().split(arriving.getFullYear());
      cArriving.innerText = parts[0].trim();
      if (gSites[gSiteNo].showAllBookings || false) {
        cGuests.innerText = cGuests.innerText + ', ' + decodeURIComponent(snapBooking.val().comment);
        cArriving.innerText = cArriving.innerText + ' ' + arriving.getFullYear();
      }

      const /** Date */ departing = new Date(snapBooking.val().departing);
      const /** number */ days = (departing - arriving) / 1000 / 60 / 60 / 24;
      cDays.innerText = days + ' night';
      if (days > 1) {cDays.innerText += 's';}

      sortTable('tBookings');
    }
  }


  // initialises and shows the Add Booking modal
  function modalAddBookingInit() {
    set('modalAddBookingSite', gSites[gSiteNo].name);
    show('modalAddBooking');
  }

  // saves a new Booking from the details on the Add Booking modal
  function modalAddBookingSave() {
    // get the values from the modal
    const /** string */ guests = get('modalAddBookingGuests').value;
    const /** Date */ arriving = getDate('modalAddBookingArriving');
    const /** Date */ departing = getDate('modalAddBookingDeparting');
    const /** string */ comment = get('modalAddBookingComment').value;

    // First, do some sanity checks...
    let /** Array<string> */ msg = [];
    if (guests == null || guests == '') {msg.push("just note who's staying");}
    if (isNaN(arriving)) {msg.push("need to know when you're arriving!");}
    if (isNaN(departing)) {msg.push("need you're departure date");}
    if (departing < arriving) {msg.push("dun du dun, dun du dun  Doo weee ooooooo  Weeee ooohhh oooooooo!");}
    if (msg.length > 0) {alert(msg); return;}

    // Seems OK, and no need to check for clashes as there can be multiple
    // crews there at the same time, so just save the booking
    try {
      let cmd = {};
      cmd.by = get('userName').innerText;
      cmd.guests = encodeURIComponent(guests);
      cmd.arriving = get('modalAddBookingArriving').value;
      cmd.departing = get('modalAddBookingDeparting').value;
      cmd.comment = encodeURIComponent(comment);
      dbBookingsRef.push(cmd);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }

    hide('modalAddBooking');
  }


  // initialises and displays the modal to modify an existing booking
  function modalModBookingInit(bookingId) {
    set('modalModBookingSite', gSites[gSiteNo].name);
    get('modalModBookingSite').bookingId = bookingId; // store it for Save

    dbBookingsRef.child(bookingId).once('value', snap => {
      get('modalModBookingGuests').value = decodeURIComponent(snap.val().guests);
      get('modalModBookingArriving').value = snap.val().arriving;
      get('modalModBookingDeparting').value = snap.val().departing;
      get('modalModBookingComment').value = decodeURIComponent(snap.val().comment);
      get('modalModBookingDetail').value = decodeURIComponent(snap.val().detail || '');
      get ('modalModBookingBy').innerText = snap.val().by;
      show('modalModBooking');
    });
  }

  function modalModBookingSave() {
    const /** string */ bookingId = get('modalModBookingSite').bookingId;

    // get the values from the modal
    const /** string */ guests = get('modalModBookingGuests').value;
    const /** Date */ arriving = getDate('modalModBookingArriving');
    const /** Date */ departing = getDate('modalModBookingDeparting');
    const /** string */ comment = get('modalModBookingComment').value;
    const /** string */ detail = get('modalModBookingDetail').value;

    // First, do some sanity checks...
    let /** Array<string> */ msg = [];
    if (guests == null || guests == '') {msg.push("just note who's staying");}
    if (isNaN(arriving)) {msg.push("need to know when you're arriving!");}
    if (isNaN(departing)) {msg.push("need you're departure date");}
    if (departing < arriving) {msg.push("dun du dun, dun du dun  Doo weee ooooooo  Weeee ooohhh oooooooo!");}
    if (msg.length > 0) {alert(msg); return;}

    // Seems OK, and no need to check for clashes as there can be multiple
    // crews there at the same time, so just save the booking
    try {
      let cmd = {};
      cmd.by = get('userName').innerText;
      cmd.guests = encodeURIComponent(guests);
      cmd.arriving = get('modalModBookingArriving').value;
      cmd.departing = get('modalModBookingDeparting').value;
      cmd.comment = encodeURIComponent(comment);
      cmd.detail = encodeURIComponent(detail);
      dbBookingsRef.child(bookingId).update(cmd);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }

    hide('modalModBooking');
  }

  function modalModBookingBin() {
    const /** string */ bookingId = get('modalModBookingSite').bookingId;
    console.log('modalModBookingBin', bookingId);

    dbBookingsRef.child(bookingId).remove();

    hide('modalModBooking');
  }






  //-----------------------  CHECKLIST
  // pops-up a modal that shows a checklist.... checklists are named
  // and then have a series of groups, under each group is a list of items.
  // The groups become headings and the items an ul
  function modalChecklist(listName) {
    set('modalChecklistTitle', gSites[gSiteNo].name + ' ' + listName);
    const /** HTMLElement */ cld = get('modalChecklistGoesHere');
    cld.checklistName = listName; // save checklist key as atribute on modal div

    // remove any existing checklist entries
    const /** number */ childCount = cld.children.length;
    for (let i=childCount-1; i>=0; i--) {cld.removeChild(cld.children[i]);}

    // get the checklist from the database and add entries
    dbChecklistsRef.child(listName).once('value', snapList => {
      snapList.forEach(snapGroup => {
        // add heading for the group
        const /** HTMLElement */ hdng = document.createElement('h4');
        hdng.innerText = snapGroup.val().title;
        hdng.style.marginBottom = "0px";
        cld.appendChild(hdng);

        // if note exists, add it too
        if (snapGroup.child('note').exists() && snapGroup.val().note != '') {
          const /** HTMLElement */ note = document.createElement('div');
          note.innerHTML = '<i>' + decodeURIComponent(snapGroup.val().note) + '</>';
          note.className = "w3-small";
          cld.appendChild(note);
        }

        // add table for the checklist items
        const /** HTMLElement */ tbl = document.createElement('table');
        tbl.className = "w3-table-all";
        snapGroup.child('List').forEach(snapItem => {
          const /** HTMLElement */ tRow = tbl.insertRow(-1);

          const /** HTMLElement */ cLabel = tRow.insertCell(0);
          const /** HTMLElement */ lbl = document.createElement('label');
          lbl.innerText = decodeURIComponent(snapItem.val());
          lbl.onclick = function() {lbl.classList.toggle("pg-strike");}
          cLabel.appendChild(lbl);

        });
        cld.appendChild(tbl);

        // add text area to capture any visitors-book notes

      });
      show('modalChecklistBar1');
      hide('modalChecklistBar2');
      show('modalChecklist');
    });

  }

  // changes the modal to allow a checklist to be adjusted
  function modalChecklistAdjust() {
    const /** HTMLElement */ cld = get('modalChecklistGoesHere');
    const /** string */ listName = cld.checklistName;

    // remove any existing checklist entries
    const /** number */ childCount = cld.children.length;
    for (let i=childCount-1; i>=0; i--) {cld.removeChild(cld.children[i]);}

    // get the checklist from the database and add entries
    let /** number */ groupNo = 0;
    dbChecklistsRef.child(listName).once('value', snapList => {
      snapList.forEach(snapGroup => {
        groupNo ++;
        // add container and heading elements for the group
        let /** HTMLElement */ group = modalChecklistGroup(groupNo,
                                              snapGroup.val().title,
                                              snapGroup.val().note);
        cld.appendChild(group);

        // add list items to the table already added to the group container
        const /** HTMLElement */ tbl = group.children[2];
        snapGroup.child('List').forEach(snapItem => {
          modalChecklistItem(tbl, snapItem.key, snapItem.val());
        });

        // add group buttons to the container
        group.appendChild( modalChecklistGroupButtons(groupNo), tbl );
      });

      hide('modalChecklistBar1');
      show('modalChecklistBar2');
    });
  }

  // creates and returns the container for a group entry on the adjust checklist
  function modalChecklistGroup(groupNo, title, note) {
    // first, set defaults for new groups ie ones not already on database
    if (title == null) {title = '';}
    if (note == null) {note = '';}

    // create the DIV container for the group
    const /** HTMLElement */ group = document.createElement('div');
    group.id = 'modalChecklist|' + groupNo;
    group.className = "w3-container w3-border w3-margin-bottom";

    group.appendChild(modalChecklistText(title, "w3-border-0", groupNo + '|title'));
    group.appendChild(modalChecklistText(note, "w3-tiny", groupNo + '|note'));

    // add table for the checklist items
    const /** HTMLElement */ tbl = document.createElement('table');
    tbl.style.width = "100%";
    tbl.id = 'modalChecklist|' + groupNo + '|List';
    group.appendChild(tbl);

    return group;
  }

  function modalChecklistGroupButtons(groupNo, tbl) {
    // buttons to add item
    const /** HTMLElement */ bar = document.createElement('div');
    bar.className = "w3-bar w3-margin-top";
    const /** HTMLElement */ btnAdd = document.createElement('button');
    btnAdd.className = "pg-btn";
    btnAdd.id = 'modalChecklist|' + groupNo + '|AddItem';
    btnAdd.innerText = 'ADD ITEM';
    btnAdd.onclick = function(e) {
      const /** HTMLElement */ tbl = e.path[2].children[2];
      modalChecklistItem(tbl);
    }
    bar.appendChild(btnAdd);
    return bar;
  }

  function modalChecklistItem(tbl, key, text) {
    if (key == null) { // no key, find largest item number to-date & increment...
      key = -1;
      for (let i=0; i<tbl.rows.length; i++) {
        const /** HTMLElement */ rNo = tbl.rows[i].cells[0].firstChild.firstChild;
        if (rNo.value > key) {key = rNo.value;}
      }
      key++;
    }

    const /** HTMLElement */ tRow = tbl.insertRow(-1);

    const /** HTMLElement */ cNo = tRow.insertCell(0);
    cNo.style.width = "50px";
    cNo.appendChild(modalChecklistNumber(key, "w3-small"));
    cNo.firstChild.firstChild.onchange = function(e) {
      // when key changes, get id of table that the target element is under
      let /** string */ id;
      for (let i=0; i<e.path.length; i++) {
        if (e.path[i].nodeName == 'TABLE') {id = e.path[i].id; break;}
      }
      // sort that table
      sortTable(id);
    }

    const /** HTMLElement */ cInp = tRow.insertCell(1);
    if (text == null) {text = '';}
    cInp.appendChild(modalChecklistText(text, "w3-small"));

    const /** HTMLElement */ cBin = tRow.insertCell(2);
    cBin.style.width = "30px";
    const bin = document.createElement('button');
    bin.className = "fa fa-trash pg-btn w3-padding-0 w3-small";
    bin.onclick = function(e) {
      // when bin clicked, find the relevant row index and delete that row
      let /** string */ id;
      let /** number */ ri;
      for (let i=0; i<e.path.length; i++) {
        if (e.path[i].nodeName == 'TR') {ri = e.path[i].rowIndex;}
        if (e.path[i].nodeName == 'TABLE') {id = e.path[i].id; break;}
      }
      get(id).deleteRow(ri);
    }
    cBin.appendChild(bin);
  }

  // creates and returns a single input entry for the adjust checklist
  function modalChecklistText(initValue, className = '', id='') {
    // force new line by wrapping in a DIV
    const /** HTMLElement */ div = document.createElement('div');
    div.style.width = "100%";

    // input element
    const /** HTMLElement */ item = document.createElement('textarea');
    if (id != '') item.id = 'modalChecklist|' + id;
    item.rows = 1;
    item.style.width = "100%";
    className += " w3-input";
    item.className = className;
    if (initValue == null) {initValue = '';}
    item.value = decodeURIComponent(initValue);

    div.appendChild(item);

    return div;
  }

  // creates and returns a single input entry for the adjust checklist
  function modalChecklistNumber(initValue, className = '', id='') {
    // force new line by wrapping in a DIV
    const /** HTMLElement */ div = document.createElement('div');
    div.style.width = "100%";

    // input element
    const /** HTMLElement */ item = document.createElement('input');
    if (id != '') item.id = 'modalChecklist|' + id;
    item.type = "number";
    item.style.width = "100%";
    className += " w3-input";
    item.className = className;
    if (initValue == null) {initValue = 0;}
    item.value = initValue;

    div.appendChild(item);

    return div;
  }

  function modalChecklistSave() {
    const /** HTMLElement */ cld = get('modalChecklistGoesHere');
    const /** string */ listName = cld.checklistName;

    let cmd = {};
    let /** number */ groupNo = 1;
    let /** HTMLElement */ title = get('modalChecklist|' + groupNo + '|title');
    while (title != null && groupNo < 99) {
      let cmdGroup = {};
      cmdGroup.title = title.value;
      cmdGroup.note = encodeURIComponent(get('modalChecklist|' + groupNo + '|note').value);

      const /** HTMLElement */ tbl = get('modalChecklist|' + groupNo + '|List');
      const /** number */ tblCount = tbl.rows.length;
      let cmdList = {};
      for (let i=0; i<tblCount; i++) {
        const /** HTMLElement */ rNo = tbl.rows[i].cells[0].firstChild.firstChild;
        const /** HTMLElement */ rTxt = tbl.rows[i].cells[1].firstChild.firstChild;
        cmdList[rNo.value] = encodeURIComponent(rTxt.value);
      }
      cmdGroup.List = cmdList;
      cmd[groupNo] = cmdGroup;

      groupNo++;
      title = get('modalChecklist|' + groupNo + '|title');
    }

    dbChecklistsRef.child(listName).update(cmd);
    hide('modalChecklist');
  }


  // adds a new group to the modal
  function modalChecklistAddGroup() {
    const /** HTMLElement */ cld = get('modalChecklistGoesHere');
    const /** number */ childCount = cld.children.length;
    let /** number */ groupNo = 0;
    for (let i=childCount-1; i>=0; i--) {
      const /** Array<string> */ parts = cld.children[i].id.split('|');
      if (parts[1] > groupNo) {groupNo = parseInt(parts[1]);}
      console.log(i, parts, groupNo);
    }

    const /** HTMLElement */ group = modalChecklistGroup(groupNo + 1);
    group.appendChild( modalChecklistGroupButtons(groupNo + 1), group.children[2] );
    get('modalChecklistGoesHere').appendChild( group );
  }



  //-----------------------  NOTES
  // show all notes...
  function modalNotesInit() {
    set('modalNotesTitle', gSites[gSiteNo].name + ' Guest Book');

    // incase was displayed before, remove listener and any note cards
    dbNotesRef.off();
    const /** HTMLElement */ listDiv = get('modalNotesGoesHere');
    for (let i=listDiv.children.length-1; i>=0; i--) {
      listDiv.removeChild(listDiv.children[i]);
    }
    gToDo = 0; // and reset the outstanding TODO counter

    // makes a card for each note and places it on the modal area, then
    // listens for any new notes and adds a card for them too
    dbNotesRef.on('child_added', snapNote => {
      modalNotesMakeCard(snapNote);
      updateNoteBadge(+1, snapNote);
    });

    // listens for any deleted notes and removes them from the modal area
    dbNotesRef.on('child_removed', snapNote => {
      const /** HTMLElement */ card = get(snapNote.key);
      if (card == null) {return;}
      updateNoteBadge(-1, snapNote);
      get('modalNotesGoesHere').removeChild(card);
    });

    // listens for any changed notes and updates the text on the page
    // :( don't know the val() before the change so can't update the badge...
    // so will (horribly) do a complete redo of the notes
    dbNotesRef.on('child_changed', snapNote => {
      const /** HTMLElement */ card = get(snapNote.key);
      if (card == null) {return;}
      modalNotesInit();
    });
  }

  // updates the oustanding TODO badge, hiding it if there are none
  function updateNoteBadge(incr, snapNote) {
    if (snapNote.val().type == 'todo') {
      if (!snapNote.child('done').exists() || !snapNote.val().done) {
        gToDo += incr;
      }
    }

    // if there are any todo, display the badge
    if (gToDo > 0) {
      set('badgeToDo', gToDo);
      show('badgeToDoDiv');
    } else {
      hide('badgeToDoDiv');
    }
  }

  // makes a card to represent the note..
  // - rotating and translating the cards to make them look 'thrown down'
  // - highlighting TODO notes
  // - placing most recent at the top (deliberate fail on first one so that
  //   the hint note goes to the top)
  function modalNotesMakeCard(snapNote) {
    const /** HTMLElement */ card = document.createElement('DIV');
    card.onclick = function() {pgIndex.modalNotePrompt(snapNote.key);}
    card.style.cursor = "pointer";
    card.className = "w3-card-4 w3-margin";
    card.style.width = (40 + Math.floor(Math.random()*40)) + '%';
    if (snapNote.val().type == 'todo') {card.classList.add("w3-yellow");}
    const /** number */ rotateDeg = Math.floor(Math.random()*10) - 5;
    const /** number */ transX = Math.floor(Math.random()*90);
    card.style.transform = 'rotate(' + rotateDeg + 'deg) translateX(' + transX + 'px)';
    card.id = snapNote.key;

    const /** HTMLElement */ text = document.createElement('DIV');
    text.className = "w3-container";
    text.innerText = decodeURIComponent(snapNote.val().text);
    card.appendChild(text);

    if (snapNote.val().done) {
      text.style.textDecorationLine = "line-through";
    }

    const /** HTMLElement */ footer = document.createElement('footer');
    footer.className = "w3-container w3-tiny w3-border-top";
    footer.innerHTML = snapNote.val().by + ' ' + snapNote.val().when;
    if (snapNote.child('doneBy').exists() && snapNote.val().doneBy != '') {
      footer.innerHTML += '<br>Done by ' + snapNote.val().doneBy;
      footer.innerHTML += ' ' + snapNote.val().doneWhen;
    }
    card.appendChild(footer);

    const /** HTMLElement */ div = get('modalNotesGoesHere');
    // cards are read in database-key order so will be in date-added sequence,
    // we want most recent ones at the top so will add each card to the top of
    // the div.
    if (div.firstChild == null) { // noting yet so make a firstChild
      div.appendChild(card);
    } else { // already card(s) so add this one to the top
      div.insertBefore(card, div.firstChild );
    }
  }

  // throws up a prompt for details for a new or of an existing note
  function modalNotePrompt(noteId) {
    get('modalNoteHeading').noteId = noteId;

    if (noteId == null) {
      set('modalNoteHeading', 'Make a new...');
      get('modalNoteTypeEntry').checked = true;
      hide('modalNoteREMOVE');
      hide('modalNoteDONE');
      show('modalNote');

    } else {
      set('modalNoteHeading', 'Change this...');
      show('modalNoteREMOVE');
      dbNotesRef.child(noteId).once('value', snapNote => {

        const /** HTMLElement */ text = document.getElementById('modalNoteText');
        text.value = decodeURIComponent(snapNote.val().text);

        const rbList = document.querySelectorAll('input[name="modalNoteType"]');
        for (let i=0; i<rbList.length; i++) {
          if (rbList[i].value == snapNote.val().type) {rbList[i].checked = true;}
        }

        if (snapNote.val().type == 'todo') {
          show('modalNoteDONE');
        } else  {
          hide('modalNoteDONE');
        }

        show('modalNote');
      });
    }
  }

  // adds a new note to the database... will trigger a refresh on all screens
  // that have the modalNotesList open via the above listeners
  function modalNoteSave() {
    const /** string */ noteId = get('modalNoteHeading').noteId;

    const /** date */ dNow = new Date();
    const /** Array<string> */ nameParts = get('userName').innerText.split(' ');

    let cmd = {};
    cmd.text = encodeURIComponent( get('modalNoteText').value );
    cmd.by = nameParts[0];
    cmd.when = dNow.toISOString().split('T')[0];
    cmd.type = document.querySelector('input[name="modalNoteType"]:checked').value;
    cmd.done = false;
    cmd.doneBy = '';

    if (noteId == null) {
      dbNotesRef.push(cmd);
    } else {
      dbNotesRef.child(noteId).update(cmd);
    }

    hide('modalNote');
  }

  // removes note on the database... will trigger a refresh on all screens
  // that have the modalNotesList open via the above listeners
  function modalNoteRemove() {
    const /** string */ noteId = get('modalNoteHeading').noteId;
    dbNotesRef.child(noteId).remove();
    hide('modalNote');
  }

  function modalNoteDone () {
    const /** string */ noteId = get('modalNoteHeading').noteId;
    const /** date */ dNow = new Date();
    const /** Array<string> */ nameParts = get('userName').innerText.split(' ');

    dbNotesRef.child(noteId).update({
      done: true,
      doneBy: nameParts[0],
      doneWhen: dNow.toISOString().split('T')[0]});

    hide('modalNote');

  }

  // list audio recordings in the Storage area, allowing click to play
  function modalAudioList() {
    show('modalAudioList');
    const /** HTMLElement */ elList = get('modalAudioListGoesHere');

    // get the stories database entries in prefered sequence
    dbStoriesRef.orderByChild('seq').off(); // so don't create multiple listeners
    dbStoriesRef.orderByChild('seq').on('child_added', snapStory => {
      const /** HTMLElement */ elStory = document.createElement('button');
      elStory.innerHTML = '<div>' + snapStory.val().who + ' on</div>'
                        + '<div><b>' + snapStory.val().what + '</b></div>'
                        + '<div class="w3-tiny">talking with ' + snapStory.val().with + '</div>';
      elStory.id = 'story|' + snapStory.key;
      // if already on page, remove it so it gets latest from database
      const /** HTMLElement */ elAlready = get(elStory.id);
      if (elAlready != null) { elAlready.remove(); }

      // set button with URL for this story and an onclick action to play it
      elStory.classList = "w3-margin";
      elStory.url = snapStory.val().URL;
      elStory.onclick = function() {pgIndex.modalAudioPlay(elStory.id);}

      // add button to the list
      elList.appendChild( elStory );
    })

  }

  function modalAudioPlay(elId) {
    const /** HTMLElement */ elPlayer = get('modalAudioPlayer');
    const /** HTMLCollection */ elList = get('modalAudioListGoesHere').children;

    // get the button that has been clicked, unhighlight all other buttons
    // and highlight this one

    for (let i=0; i<elList.length; i++) {
      elList[i].classList.remove("w3-green");
    }

    const /** HTMLElement */ elClicked = get(elId);
    elClicked.classList.add("w3-green");

    // if already playing, pause it... otherwise reset player with this new story
    // and start playing it.
    if (elPlayer.src == elClicked.url) {
      if (elPlayer.paused) {elPlayer.play();} else {elPlayer.pause(); }
    } else {
      hide('modalAudioIntro');
      show('modalAudioPlayer');
      elPlayer.src = elClicked.url;
      elPlayer.play();
    }

    //
    return false;
  }

  //-----------------------  ADMIN FUNCTIONS
  // pops up modal that allows new site to be added... 
  function modalAddSite() {
    show('modalAddSite');
  }

  function modalAddSiteSave() {
    // check that have all required info
    const /** string */ name1 = get('modalAddSiteName1').value;
    if (name1 == '') {alert('must have a one word name'); return;}

    const /** string */ name2 = get('modalAddSiteName2').value;
    if (name2 == '') {alert('must have a simple descriptor'); return;}
    
    hide('modalAddSite');

    // push new site onto Settings, which will trigger a refresh
    dbRootRef.child('Settings').push({name: name1, siteName: name2});
  }

//-----------------------------------------------------------
// expose wrapped functions that get called from the HTML
return {modalAddBookingInit: modalAddBookingInit,
        modalAddBookingSave: modalAddBookingSave,
        modalAddSite: modalAddSite,
        modalAddSiteSave: modalAddSiteSave,
        modalAudioList: modalAudioList,
        modalAudioPlay: modalAudioPlay,
        modalModBookingSave: modalModBookingSave,
        modalModBookingBin: modalModBookingBin,
        modalChecklist: modalChecklist,
        modalChecklistAdjust: modalChecklistAdjust,
        modalChecklistAddGroup: modalChecklistAddGroup,
        modalChecklistSave: modalChecklistSave,
        modalNotePrompt: modalNotePrompt,
        modalNoteSave: modalNoteSave,
        modalNoteRemove: modalNoteRemove,
        modalNoteDone: modalNoteDone}

} (); // // end and immediately execute the ananymous wrapper
