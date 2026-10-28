/* Native bridge for the Android APK (Capacitor).
   - Provides window.SpeechRecognition using Android's native recogniser
   - Native save/share for the Word file
   - Opens external links in the system browser */
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform()) return;
  var P=C.Plugins||{};

  /* ---------- Speech recognition ---------- */
  var SP=P.SpeechRecognition;
  if(SP){
    function NativeSR(){
      this.continuous=true;this.interimResults=true;this.lang='en-IN';this.maxAlternatives=1;
      this.onresult=null;this.onerror=null;this.onend=null;this.onstart=null;
      this._active=false;this._last='';this._handles=[];this._ended=false;
    }
    NativeSR.prototype._fireErr=function(code){
      if(this.onerror) try{this.onerror({error:code});}catch(e){}
    };
    NativeSR.prototype._finish=function(){
      if(this._ended) return; this._ended=true; this._active=false;
      var self=this;
      this._handles.forEach(function(h){try{h.remove();}catch(e){}});
      this._handles=[];
      var txt=(this._last||'').trim();
      if(txt&&this.onresult){
        var alt={transcript:txt,confidence:1};
        var res=[alt];res.isFinal=true;res.item=function(i){return this[i];};
        try{this.onresult({resultIndex:0,results:[res]});}catch(e){}
      }
      this._last='';
      if(this.onend) try{this.onend();}catch(e){}
    };
    NativeSR.prototype.start=function(){
      var self=this;
      (async function(){
        try{
          var av=await SP.available();
          if(!av||!av.available){self._fireErr('service-not-allowed');self._finish();return;}
          var perm=await SP.checkPermissions();
          if(!perm||perm.speechRecognition!=='granted'){
            perm=await SP.requestPermissions();
            if(!perm||perm.speechRecognition!=='granted'){self._fireErr('not-allowed');self._finish();return;}
          }
          self._active=true;
          var h1=await SP.addListener('partialResults',function(d){
            var t=d&&d.matches&&d.matches[0];
            if(!t) return;
            self._last=t;
            if(self.interimResults&&self.onresult){
              var alt={transcript:t,confidence:1};
              var res=[alt];res.isFinal=false;res.item=function(i){return this[i];};
              try{self.onresult({resultIndex:0,results:[res]});}catch(e){}
            }
          });
          var h2=await SP.addListener('listeningState',function(d){
            if(d&&d.status==='stopped') self._finish();
          });
          self._handles.push(h1,h2);
          if(self.onstart) try{self.onstart();}catch(e){}
          await SP.start({language:self.lang,partialResults:true,popup:false,maxResults:1});
        }catch(err){
          var m=String(err&&err.message||err).toLowerCase();
          if(m.indexOf('permission')>-1) self._fireErr('not-allowed');
          else if(m.indexOf('network')>-1) self._fireErr('network');
          else if(m.indexOf('language')>-1) self._fireErr('language-not-supported');
          else self._fireErr('audio-capture');
          self._finish();
        }
      })();
    };
    NativeSR.prototype.stop=function(){try{SP.stop();}catch(e){}var s=this;setTimeout(function(){s._finish();},600);};
    NativeSR.prototype.abort=function(){this._last='';try{SP.stop();}catch(e){}this._finish();};
    window.SpeechRecognition=NativeSR;
    window.webkitSpeechRecognition=NativeSR;
  }

  /* ---------- Word file: save + share sheet ---------- */
  window.nativeSaveDoc=async function(filename,content,title){
    try{
      var FS=P.Filesystem,SH=P.Share;
      if(!FS||!SH) return false;
      var w=await FS.writeFile({path:filename,data:content,directory:'CACHE',encoding:'utf8'});
      await SH.share({title:title||filename,dialogTitle:'Save or send MOM',files:[w.uri]});
      return true;
    }catch(e){
      return /cancel/i.test(String(e&&e.message||e));
    }
  };

  /* ---------- External links -> system browser ---------- */
  var origOpen=window.open;
  window.open=function(url){
    try{
      if(url&&/^https?:/i.test(url)&&P.Browser){P.Browser.open({url:url});return null;}
    }catch(e){}
    return origOpen?origOpen.apply(window,arguments):null;
  };

  /* Keep screen on handled by the app's wake lock; also keep CSS safe-area */
})();
