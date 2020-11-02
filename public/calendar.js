/**
 * @file adds html for and defines functions to handle a monthly calendar.
 * Requires the calendar.css for formatting to work.
 * Part of the possums gully web application.
 * @author Rod Hawkes
 */
'use strict';
// Wrap everything in an anonymous function so that all function names and
// global variables are kept local to this js and can't be accidently
// overridden by other js code
const rjhCalendar = function() {
  // when initially included, add the calendar HTML to the page. This expects
  // there to be a DIV called 'calendar-here';
  const /** HTMLElement */ calContainer = document.getElementById('calendar-goes-here');
  const /** HTMLElement */ calMonth = addCalendarElement('calendar-month', calContainer);
  const /** HTMLElement */ calSect = addCalendarElement('calendar-month-header', calMonth, 'section');
  const /** HTMLElement */ calSelected = addCalendarElement('calendar-month-header-selected-month', calSect, 'div', 'selected-month');
  const /** HTMLElement */ calPagination = addCalendarElement('calendar-month-header-selectors', calSect, 'div');
  const /** HTMLElement */ calPrev = addCalendarElement('', calPagination, 'span', 'previous-month-selector');
  const /** HTMLElement */ calPres = addCalendarElement('', calPagination, 'span', 'present-month-selector');
  const /** HTMLElement */ calNext = addCalendarElement('', calPagination, 'span', 'next-month-selector');
  const /** HTMLElement */ calDoW = addCalendarElement('day-of-week', calMonth, 'ol', 'days-of-week');
  const /** HTMLElement */ calGrid = addCalendarElement('days-grid', calMonth, 'ol', 'calendar-days');

  calPrev.innerHTML = '&nbsp;<i class="fa fa-angle-left"></i>&nbsp;';
  calPrev.onclick = function() {rjhCalendar.advanceMonth(-1)};

  calPres.innerHTML = 'Today';
  calPres.onclick = function() {rjhCalendar.buildCalendar(new Date())};

  calNext.innerHTML = '&nbsp;<i class="fa fa-angle-right"></i>&nbsp;';
  calNext.onclick = function() {rjhCalendar.advanceMonth(1)};

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  WEEKDAYS.forEach(weekday => {
    const weekDayElement = document.createElement("li");
    calDoW.appendChild(weekDayElement);
    weekDayElement.innerText = weekday;
  });

  let /** Date */ calCurrent;


  //------------------------  DEFINE FUNCTIONS -----------------------------

  // adds a calendar element as child to the specified parent, returning child
  function addCalendarElement(classNames, parent, type='div', id='') {
    const /** HTMLElement */ div = document.createElement(type);
    div.className = classNames;
    if (id != '') {div.id = id;}
    parent.appendChild(div);
    return div;
  }

  function advanceMonth(incr) {
    calCurrent.setMonth(calCurrent.getMonth() + incr);
    buildCalendar(calCurrent);
  }

  // Clears then rebuilds the monthly part of the calendar for the specified month
  function buildCalendar(displayDate='') {
    // remove any previous...
    while( calGrid.firstChild ){
      calGrid.removeChild( calGrid.firstChild );
    }

    // now rebuild...
    if (displayDate != '') {calCurrent = displayDate};
    const /** number */ year = calCurrent.getFullYear();
    const /** number */ month = calCurrent.getMonth() + 1; // JAN = 1
    const /** number */ startDay = new Date(year, month - 1, 1).getDay(); // day of week, SUN = 0

    calSelected.innerText = calCurrent.toLocaleString('default', { month: 'long' }) + ' ' + year;

    // fill in last few days for last month
    let /** number */ day = daysInMonth(year, month - 1) - startDay + 1;
    for (let i=0; i<startDay; i++) {buildCalendarDay(day, -1); day++;}

    // fill in days for this month
    for (let i=0; i<daysInMonth(year, month); i++) {buildCalendarDay(i+1);}

    // fill in first few days of next month
    day = 1;
    let /** number */ limit = 35;
    if (calGrid.children.length > 35) {limit=42};
    for (let i=daysInMonth(year, month) + startDay; i<limit; i++) {
      buildCalendarDay(day, +1);
      day ++;
    }

    // now that have rebuilt the display, trigger an event so that parents
    // can populate the calendar
    let e = new Event("rjhCalendarBuilt", {bubbles: true});
    document.dispatchEvent(e);
  }

  // appends a new li to the calendar, effectively creating an entry for the
  // next day in the month
  function buildCalendarDay(dayNumber, monthIncr=0) {
    const /** Date */ newDate = new Date(calCurrent);
    newDate.setMonth(newDate.getMonth() + monthIncr);
    newDate.setDate(dayNumber);

    const /** HTMLElement */ li = document.createElement('li');
    li.innerHTML = '<span>' + dayNumber + '</span>';
    li.id = getYYYYMMDD(newDate);
    li.className = "calendar-day";
    calGrid.appendChild(li);
  }

  // returns given date in YYYY-MM-DD format for local date
  function getYYYYMMDD(date) {
    const /** string */ yyyy = date.getFullYear();
    let /** string */  mm = date.getMonth() + 1;
    if (mm < 10) {mm = '0' + mm;}
    let /** string */  dd = date.getDate();
    if (dd < 10) {dd = '0' + dd;}
    return yyyy + '-' + mm + '-' + dd;
  }

  // returns the number of days in a month by creating a Date object with the
  // specified year and month and a zero for the day.. which indicates the last
  // day of the previous month... but we are expecting month with JAN = 1, so...
  function daysInMonth(year, month) {
    const /** Date */ ldpm = new Date(year, month, 0);
    const /** number */ days = ldpm.getDate();
    return days;
  }



//-----------------------------------------------------------
// expose wrapped functions that get called from the HTML
return {buildCalendar: buildCalendar,
        daysInMonth: daysInMonth,
        advanceMonth: advanceMonth,
        getYYYYMMDD: getYYYYMMDD}

} (); // // end and immediately execute the ananymous wrapper
