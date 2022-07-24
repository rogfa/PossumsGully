/**
 * @file Adds the modalUpload elements to the web page. Functions display
 * an upload prompt and handle a file upload to Firebase storage.
 * @author Rod Hawkes
 */
 'use strict'
 const modalUpload = function() {
   const /** string */ gModalNm = 'modalUpload';
   const /** string */ gCloseFunction = "document.getElementById('" + gModalNm + "').style.display='none'";
   let /** string */ gPath = null;
   addHTML();
   console.log('modalUpload init');


  function addHTML() {
   const /** HTMLElement */ modal = document.createElement('DIV');
   modal.className = "w3-modal";
   modal.id = gModalNm;
   modal.style = "z-index:6"; // so alerts go ontop of other modals eg forms
   document.body.appendChild(modal);

   const /** HTMLElement */ card = document.createElement('DIV');
   card.className = "w3-modal-content w3-card-4 w3-animate-opacity";
   card.style.width = "350px";
   modal.appendChild(card);

   const /** HTMLElement */ close = document.createElement('SPAN');
   close.setAttribute("onclick", gCloseFunction);
   close.className = "w3-button w3-display-topright";
   close.innerHTML = '<i class="fas fa-times"></i>';
   card.appendChild(close);

   const /** HTMLElement */ container1 = document.createElement('DIV');
   container1.className = "w3-container";
   card.appendChild(container1);

   const /** HTMLElement */ h2 = document.createElement('h2');
   h2.id = gModalNm + 'Head';
   h2.style.marginBottom = "0px";
   container1.appendChild(h2);

   const /** HTMLElement */ h3 = document.createElement('DIV');
   h3.id = gModalNm + 'SubHead';
   h3.className = "w3-small w3-margin-bottom";
   container1.appendChild(h3);


   const /** HTMLElement */ eByDiv = document.createElement('DIV');
   eByDiv.className = "w3-margin-bottom w3-row";
   container1.appendChild(eByDiv);
   const /** HTMLElement */ eByLabel = document.createElement('LABEL');
   eByLabel.innerText = 'Told by:';
   eByLabel.className = "w3-col w3-padding";
   eByLabel.style = "width:30%";
   eByDiv.appendChild(eByLabel);
   const /** HTMLElement */ eByInp = document.createElement('INPUT');
   eByInp.id = gModalNm + 'By';
   eByInp.type = 'text';
   eByInp.required = true;
   eByInp.className = "w3-input w3-col";
   eByInp.style = "width:70%";
   eByInp.setAttribute('onchange', 'modalUpload.check()');
   eByDiv.appendChild(eByInp);

   const /** HTMLElement */ eToDiv = document.createElement('DIV');
   eToDiv.className = "w3-margin-bottom w3-row";
   container1.appendChild(eToDiv);
   const /** HTMLElement */ eToLabel = document.createElement('LABEL');
   eToLabel.innerText = 'with:';
   eToLabel.className = "w3-col w3-padding";
   eToLabel.style = "width:30%";
   eToDiv.appendChild(eToLabel);
   const /** HTMLElement */ eToInp = document.createElement('INPUT');
   eToInp.id = gModalNm + 'To';
   eToInp.type = 'text';
   eToInp.required = true;
   eToInp.className = "w3-input w3-col";
   eToInp.style = "width:70%";
   eToInp.setAttribute('onchange', 'modalUpload.check()');
   eToDiv.appendChild(eToInp);

   const /** HTMLElement */ eAboutDiv = document.createElement('DIV');
   eAboutDiv.className = "w3-margin-bottom w3-row";
   container1.appendChild(eAboutDiv);
   const /** HTMLElement */ eAboutLabel = document.createElement('LABEL');
   eAboutLabel.innerText = 'Topic:';
   eAboutLabel.className = "w3-col w3-padding";
   eAboutLabel.style = "width:30%";
   eAboutDiv.appendChild(eAboutLabel);
   const /** HTMLElement */ eAboutInp = document.createElement('INPUT');
   eAboutInp.id = gModalNm + 'About';
   eAboutInp.type = 'text';
   eAboutInp.required = true;
   eAboutInp.className = "w3-input w3-col";
   eAboutInp.style = "width:70%";
   eAboutInp.setAttribute('onchange', 'modalUpload.check()');
   eAboutDiv.appendChild(eAboutInp);

   const /** HTMLElement */ fi = document.createElement('input');
   fi.id = gModalNm + 'File';
   fi.type = 'file';
   fi.className = "w3-input";
   fi.setAttribute('onchange', 'modalUpload.check()');
   container1.appendChild(fi);

   const /** HTMLElement */ msg = document.createElement('label');
   msg.id = gModalNm + 'Msg';
   container1.appendChild(msg);

   const /** HTMLElement */ progressContainer = document.createElement('DIV');
   progressContainer.style="width:100%; display:none";
   progressContainer.className = "w3-border";
   progressContainer.id = gModalNm + 'ProgressContainer';
   container1.appendChild(progressContainer);
   const /** HTMLElement */ progressBar = document.createElement('DIV');
   progressBar.style="height:20px";
   progressBar.className = "w3-green";
   progressBar.id = gModalNm + 'Progress';
   progressContainer.appendChild(progressBar);


   const /** HTMLElement */ btnBar = document.createElement('DIV');
   btnBar.className = "w3-bar w3-margin-bottom";
   btnBar.appendChild(createSimpleButton(gModalNm + "Up", 'UPLOAD', null));
   btnBar.appendChild(createSimpleButton(gModalNm + "No", 'CANCEL', gCloseFunction));
   card.appendChild( btnBar );

   const /** HTMLElement */ canvasContainer = document.createElement('DIV');
   canvasContainer.className = "w3-border w3-margin";
   canvasContainer.id = gModalNm + 'CanvasContainer';
  }

  function createSimpleButton(buttonId, buttonText, onclickFunction) {
    const btn = document.createElement('button');
    btn.id = buttonId;
    btn.setAttribute("class", "w3-bar-item w3-btn");
    btn.setAttribute("onclick", onclickFunction);
    btn.innerText = buttonText;
    return btn;
  }


  /**
   * prepares and displays the modal prompt
   */
  function show(watermarkText='') {
    document.getElementById(gModalNm + 'Head').innerText = 'Add a new story';
    document.getElementById(gModalNm + 'SubHead').innerText = watermarkText;
    document.getElementById(gModalNm + "Up").disabled= true;
    document.getElementById(gModalNm + "Msg").innerText = '';
    document.getElementById(gModalNm + 'Progress').style.width = '0%';
    document.getElementById(gModalNm + 'ProgressContainer').style.display = "none";
    document.getElementById(gModalNm).style.display = "block";

    let thisCall = 'modalUpload.upload()';
    document.getElementById(gModalNm + 'Up').setAttribute('onclick', thisCall);

    check();
  }

  /**
  * remembers the path under which future files are to be stored
  */
  function changePath(path) {
    gPath = path;
    console.log('storage path now', gPath);
  }

  /**
  */
  function check() {
    const /** HTMLElement */ elSelector = document.getElementById(gModalNm + 'File');
    const /** HTMLElement */ elMsg = document.getElementById(gModalNm + 'Msg');
    const /** HTMLElement */ elBy = document.getElementById(gModalNm + 'By');
    const /** HTMLElement */ elTo = document.getElementById(gModalNm + 'To');
    const /** HTMLElement */ elAbout = document.getElementById(gModalNm + 'About');

    // default is to disable the upload
    document.getElementById(gModalNm + "Up").disabled= true;
    elMsg.innerText = '';

    // make sure that the meta data is entered so index can be created on the database
    if (elBy.value == '') {elMsg.innerText = 'Please note who is telling the story'; elBy.focus(); return;}
    if (elTo.value == '') {elMsg.innerText = 'Please note who is recording the story'; elTo.focus(); return;}
    if (elAbout.value == '') {elMsg.innerText = 'Please note what the story is about'; elAbout.focus(); return;}
    if (elSelector.files.length < 1) {elMsg.innerText = 'Please select an audio file';  return;}

    // check that the selected file is the right type
    for (let i=0; i<elSelector.files.length; i++) {
      const /** number */ size = parseInt(elSelector.files[i].size / 1024);
      const /** Array<string> */ type = elSelector.files[i].type.split('/');

      let /** string */ msg = '';
      let /** boolean */ dis = true;
      if (type[0] != 'audio') {msg = 'Please select an audio file';};
      if (msg == '') {msg = size + 'KB ' + type[1] + ' audio selected.'; dis=false;}
      document.getElementById(gModalNm + "Up").disabled= dis;
      elMsg.innerText = msg;
    }
  }

  /**
  * uploads a single file to firebase storage then adds a database entry
  * referencing this file
  */
  function upload() {
    document.getElementById(gModalNm + 'ProgressContainer').style.display = "block";
    const /** HTMLElement */ elSelector = document.getElementById(gModalNm + 'File');
    const /** object */ file = elSelector.files[0];
    const /** HTMLElement */ elProgress = document.getElementById(gModalNm + 'Progress');

    const fileRef = firebase.storage().ref().child(gPath+'/'+file.name);
    let uploadTask = fileRef.put(file);
    uploadTask.on('state_changed', function(snapshot){
      let /** number */ soFar = snapshot.bytesTransferred;
      let /** number */ progress = parseInt( soFar * 100 / file.size);
      elProgress.style.width = progress + '%';
      elProgress.innerText = progress + '%';

    }, function(err) {
      alert(err + ' during file upload.');

    }, function() {
      console.log('upload complete');
      document.getElementById(gModalNm).style.display = "none";
      const fileURL = fileRef.getDownloadURL().then(function(url){
        const /** object */ cmd = {};
        cmd['who'] = document.getElementById(gModalNm + 'By').value;
        cmd['with'] = document.getElementById(gModalNm + 'To').value;
        cmd['what'] = document.getElementById(gModalNm + 'About').value;
        cmd['seq'] = 900; // TODO seq
        cmd['URL'] = url;
        console.log(cmd);
        dbRootRef.child('Stories').child(gPath).push(cmd);
      });
    });
  }


  //-----------------------------------------------------------
  // expose wrapped functions that get called from the HTML
  return {changePath: changePath,
          check:check,
          show: show,
          upload: upload}
} (); // // end and immediately execute the ananymous wrapper
