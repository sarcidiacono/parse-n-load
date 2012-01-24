
//unfortunately you can't get the path of a file input.
// function runTest() {
//     var files = YAHOO.util.Dom.get('js-file').files;
//     console.log(files[0]);
// }

var SIMPLE = 0;
var PARSE = 1;
var PARSE_AS_STRING = 2;
var PARSE_AND_EVALUATE = 3;
var PARSE_AS_STRING_AND_EVALUATE = 4;
var LABELS = [
    'Simple', 'Parse only', 'Parse as string', 'Parse, then evaluate', 'eval() call'
    ];
var testcases = 5;

function init() {
    window.data = [[],[],[],[],[]];
    window.jsframe = YAHOO.util.Dom.get('js');
    window.doc = YAHOO.util.Dom.get('js').contentWindow.document;
    window.win = YAHOO.util.Dom.get('js').contentWindow;
    window.progress = YAHOO.util.Dom.get('progress');
    window.script = {
         filename: null,
         code: null
    };
    window.runs = 3;
    window.i = 0;
    window.runnable = true;

    window.icon = '';
    if (match('Safari')) {
        icon = 'safari';
        if (match('Chrome')) {
            icon = 'chrome';
        }
    } else if (match('Firefox')) {
        icon = 'firefox';
    } else if (match('Opera')) {
        icon = 'opera';
    } else if (match('MSIE')) {
        icon = 'ie';
    }
}
window.onload = init;

function map(fn, lst) {
    var ret = [];
    for (var i=0; i<lst.length; i++) {
        ret.push(fn(lst[i]));
    }
    return ret;
}

function filter(fn, lst) {
    var ret = [];
    for (var i=0; i<lst.length; i++) {
        if (fn(lst[i])) {
            ret.push(lst[i]);
        }
    }
    return ret;
}

function reduce(fn, lst, acc) {
    for (var i=0; i<lst.length; i++) {
        acc = fn(lst[i], acc);
    }
    return acc;
}

function sum(lst) {
    return reduce(function(a,b){return a+b;}, lst, 0);
}

function avg(lst) {
    var tot = sum(lst);
    return tot / lst.length;
}

function stdev(lst, mean) {
    var tot = sum(lst);
    mean = mean || avg(lst);
    var squares = map(function(x){return (x-mean)*(x-mean);}, lst);
    return Math.sqrt(sum(squares) / (lst.length-1));
}

function le(lst, lim) {
    return filter(function(a){return a[1]<=lim;}, lst);
}

function nonzero(lst) {
    return filter(function(a){return a[1]>0;}, lst);
}

function nthPercentile(lst, n) {
    var a = lst.slice();
    a.sort(function(x,y){return x[1]-y[1];});
    var lim = a[Math.floor(a.length * n)][1];
    return nonzero(le(lst, lim));
}

function flotPlot(data) {
    progress.innerHTML = (script.filename?
            '<div><b>File:</b> '+script.filename+'</div>':
            '')+
        '<div><small>'+navigator.userAgent+'</small></div>';
    
    for(var testcase=0; testcase<testcases; testcase++) {
        if (YAHOO.util.Dom.get('ignore-spikes').checked) {
                data[testcase] = nthPercentile(data[testcase], 0.95);
        }
        var lst = map(function(x){return x[1];}, data[testcase]);
        var mean = avg(lst);
        var variance = stdev(lst, mean);
        progress.innerHTML += [
                              '<div><b>Testcase ',(testcase+1),': '+LABELS[testcase]+'</b></div>',
                              '<div><b>Mean Average:</b> ',mean.toFixed(0),' msecs</div>',
                              '<div><b>Std. Deviation:</b> ',variance.toFixed(1),' msecs</div>']
                            .join('');
        data[testcase] = {label: LABELS[testcase], data: data[testcase]};
    }
    YAHOO.widget.Flot("flot", data,
                      {color:2,
                       lines:{show:true}
                      });
    YAHOO.util.Dom.get('browser-icon').src = 'img/icon-'+icon+'.png';
}

function time() {
    return (new Date()).getTime();
}

function match(s) {
    return nav.indexOf(s) !== -1;
}

function delel(el) {
    el.parentNode.removeChild(el);
}

function recordTrial(msec) {
    data[testcase][i] = [i, msec];
    if (i<runs) {
        testcase = (testcase+1)%testcases;
        if(testcase == 0) i += 1;
        loadFile2();
    } else {
        flotPlot(data);
    }
}

function loadFile2() {
    delel(jsframe);
    jsframe = document.createElement('iframe');
    jsframe.is = 'js';
    jsframe.src = script.filename + '.html';
    document.body.appendChild(jsframe);
}

//for non-blocking browsers. careful not to blow the stack.
function loadFile(i, testcase) {
    if (i<runs) {
        doc.close();
        doc.write('<script>var start = (new Date()).getTime();</script>');
        doc.write('<script id="test" '+
        (script.filename?
            'src="'+script.filename+'">':
            '>'+makeCodeFor(script.code, testcase))+
        '</script>');
        doc.write('<script>top.data['+testcase+']['+i+'] = ['+i+', (new Date()).getTime() - start];</script>');
        doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
        testcase = (testcase+1)%testcases;
        if(testcase==0) i++;
        doc.write('<script>window.setTimeout(function(){top.loadFile('+i+', '+testcase+');});</script>');
        doc.close();
    } else {
        flotPlot(data);
    }
}

function makeCodeFor(code, testcase) {
    //XXX code string should be created before the timer starts
    //TODO does it make any difference if the code is evaluated only once at the beginning of the test?
    function escape(code) {
        return code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, "'+\n'");
    }
    
    switch(testcase) {
        case SIMPLE:
            return code;
        case PARSE:
            return 'function parse() { '+code+' }';
        case PARSE_AS_STRING:
            return 'function parse_as_string() { eval(\''+escape(code)+'\'); }';
        case PARSE_AND_EVALUATE:
            return 'function parse() { '+code+' } parse();';
        case PARSE_AS_STRING_AND_EVALUATE:
            return 'function parse_as_string() { eval(\''+escape(code)+'\'); } parse_as_string();';
    }
}

// browsecap crap.
// blocking = (Safari 4 (but not Chrome)) or (Opera)
var nav = navigator.userAgent;
var blocking = (match('Safari') && !match('Chrome') && match('Version/4')) || match('Opera');


function runInit() {
    runs = parseInt(YAHOO.util.Dom.get('num-runs').value||'3');
    data = new Array(testcases);
    for(var i=0;i<testcases; i++) data[i] = new Array(runs);
    script.filename = YAHOO.util.Dom.get('js-file').value;
    script.code = YAHOO.util.Dom.get('js-code').value;
}


function runTest() {
    runInit();

    if (YAHOO.util.Dom.get('test-version').value === '2') {
        loadFile2();
        return;
    }

    // Safari 4 blocks when writing script tags. Firefox does not.
    // Chrome does not block, but the naive code path blows the
    // stack after just 20 iterations (ORLY? RLY.)
    // hence the window.setTimeout(fn, 0);
    if (blocking) {
        for (var i=0; i<runs; i++) 
            for (var testcase=0; testcase<testcases; testcase++) {
                doc.open();
                var start = time();
                doc.write('<script id="test" '+
                (script.filename?
                    'src="'+script.filename+'">':
                    '>'+makeCodeFor(script.code, testcase))+
                '</script>');
                doc.write('<script>var e=document.getElementById("test"); e.parentNode.removeChild(e);</script>');
                doc.close();
                data[testcase][i] = [i, (new Date()).getTime() - start];
            }
        flotPlot(data);
    } else {
        window.setTimeout(function(){loadFile(0,0);}, 0);
    }
}

function stopTest() {
    runnable = false;
}