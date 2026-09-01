// GENERATED FILE — DO NOT EDIT.
//
// Produced by tool/gen-calc-js.mjs from the Dart calculation layer:
//   lib/core/calc/  ·  lib/billing/entitlements.dart  ·  lib/trades/
//
// This is the SAME arithmetic the Android app runs, compiled to
// JavaScript — not a port of it. Editing this file by hand puts the two
// surfaces back out of step, which is the exact problem it removes.
//
// Regenerate:  npm --prefix site run calc     (needs the Dart SDK)
// Verify:      node tool/gen-calc-js.mjs --check
//
// SOURCES_SHA256: f029969bdcdff4f285538c0ba13df95664494d43cb6b00b622cba05d14665d28
/* eslint-disable */
// @ts-nocheck
(function dartProgram(){function copyProperties(a,b){var t=Object.keys(a)
for(var s=0;s<t.length;s++){var r=t[s]
b[r]=a[r]}}function mixinPropertiesHard(a,b){var t=Object.keys(a)
for(var s=0;s<t.length;s++){var r=t[s]
if(!b.hasOwnProperty(r)){b[r]=a[r]}}}function mixinPropertiesEasy(a,b){Object.assign(b,a)}var z=function(){var t=function(){}
t.prototype={p:{}}
var s=new t()
if(!(Object.getPrototypeOf(s)&&Object.getPrototypeOf(s).p===t.prototype.p))return false
try{if(typeof navigator!="undefined"&&typeof navigator.userAgent=="string"&&navigator.userAgent.indexOf("Chrome/")>=0)return true
if(typeof version=="function"&&version.length==0){var r=version()
if(/^\d+\.\d+\.\d+\.\d+$/.test(r))return true}}catch(q){}return false}()
function inherit(a,b){a.prototype.constructor=a
a.prototype["$i"+a.name]=a
if(b!=null){if(z){Object.setPrototypeOf(a.prototype,b.prototype)
return}var t=Object.create(b.prototype)
copyProperties(a.prototype,t)
a.prototype=t}}function inheritMany(a,b){for(var t=0;t<b.length;t++){inherit(b[t],a)}}function mixinEasy(a,b){mixinPropertiesEasy(b.prototype,a.prototype)
a.prototype.constructor=a}function mixinHard(a,b){mixinPropertiesHard(b.prototype,a.prototype)
a.prototype.constructor=a}function lazy(a,b,c,d){var t=a
a[b]=t
a[c]=function(){if(a[b]===t){a[b]=d()}a[c]=function(){return this[b]}
return a[b]}}function lazyFinal(a,b,c,d){var t=a
a[b]=t
a[c]=function(){if(a[b]===t){var s=d()
if(a[b]!==t){A.hH(b)}a[b]=s}var r=a[b]
a[c]=function(){return r}
return r}}function makeConstList(a,b){if(b!=null)A.d(a,b)
a.$flags=7
return a}function convertToFastObject(a){function t(){}t.prototype=a
new t()
return a}function convertAllToFastObject(a){for(var t=0;t<a.length;++t){convertToFastObject(a[t])}}var y=0
function instanceTearOffGetter(a,b){var t=null
return a?function(c){if(t===null)t=A.cV(b)
return new t(c,this)}:function(){if(t===null)t=A.cV(b)
return new t(this,null)}}function staticTearOffGetter(a){var t=null
return function(){if(t===null)t=A.cV(a).prototype
return t}}var x=0
function tearOffParameters(a,b,c,d,e,f,g,h,i,j){if(typeof h=="number"){h+=x}return{co:a,iS:b,iI:c,rC:d,dV:e,cs:f,fs:g,fT:h,aI:i||0,nDA:j}}function installStaticTearOff(a,b,c,d,e,f,g,h){var t=tearOffParameters(a,true,false,c,d,e,f,g,h,false)
var s=staticTearOffGetter(t)
a[b]=s}function installInstanceTearOff(a,b,c,d,e,f,g,h,i,j){c=!!c
var t=tearOffParameters(a,false,c,d,e,f,g,h,i,!!j)
var s=instanceTearOffGetter(c,t)
a[b]=s}function setOrUpdateInterceptorsByTag(a){var t=v.interceptorsByTag
if(!t){v.interceptorsByTag=a
return}copyProperties(a,t)}function setOrUpdateLeafTags(a){var t=v.leafTags
if(!t){v.leafTags=a
return}copyProperties(a,t)}function updateTypes(a){var t=v.types
var s=t.length
t.push.apply(t,a)
return s}function updateHolder(a,b){copyProperties(b,a)
return a}var hunkHelpers=function(){var t=function(a,b,c,d,e){return function(f,g,h,i){return installInstanceTearOff(f,g,a,b,c,d,[h],i,e,false)}},s=function(a,b,c,d){return function(e,f,g,h){return installStaticTearOff(e,f,a,b,c,[g],h,d)}}
return{inherit:inherit,inheritMany:inheritMany,mixin:mixinEasy,mixinHard:mixinHard,installStaticTearOff:installStaticTearOff,installInstanceTearOff:installInstanceTearOff,_instance_0u:t(0,0,null,["$0"],0),_instance_1u:t(0,1,null,["$1"],0),_instance_2u:t(0,2,null,["$2"],0),_instance_0i:t(1,0,null,["$0"],0),_instance_1i:t(1,1,null,["$1"],0),_instance_2i:t(1,2,null,["$2"],0),_static_0:s(0,null,["$0"],0),_static_1:s(1,null,["$1"],0),_static_2:s(2,null,["$2"],0),makeConstList:makeConstList,lazy:lazy,lazyFinal:lazyFinal,updateHolder:updateHolder,convertToFastObject:convertToFastObject,updateTypes:updateTypes,setOrUpdateInterceptorsByTag:setOrUpdateInterceptorsByTag,setOrUpdateLeafTags:setOrUpdateLeafTags}}()
function initializeDeferredHunk(a){x=v.types.length
a(hunkHelpers,v,w,$)}var J={
ew(a,b){if(a<0||a>4294967295)throw A.b(A.aK(a,0,4294967295,"length",null))
return J.ey(new Array(a),b)},
ex(a,b){if(a<0)throw A.b(A.bI("Length must be a non-negative integer: "+a))
return A.d(new Array(a),b.i("e<0>"))},
ey(a,b){var t=A.d(a,b.i("e<0>"))
t.$flags=1
return t},
ez(a,b){return J.ec(a,b)},
da(a){if(a<256)switch(a){case 9:case 10:case 11:case 12:case 13:case 32:case 133:case 160:return!0
default:return!1}switch(a){case 5760:case 8192:case 8193:case 8194:case 8195:case 8196:case 8197:case 8198:case 8199:case 8200:case 8201:case 8202:case 8232:case 8233:case 8239:case 8287:case 12288:case 65279:return!0
default:return!1}},
eA(a,b){var t,s
for(t=a.length;b<t;){s=a.charCodeAt(b)
if(s!==32&&s!==13&&!J.da(s))break;++b}return b},
eB(a,b){var t,s
for(;b>0;b=t){t=b-1
s=a.charCodeAt(t)
if(s!==32&&s!==13&&!J.da(s))break}return b},
ah(a){if(typeof a=="number"){if(Math.floor(a)==a)return J.aD.prototype
return J.be.prototype}if(typeof a=="string")return J.a6.prototype
if(a==null)return J.aE.prototype
if(typeof a=="boolean")return J.bd.prototype
if(Array.isArray(a))return J.e.prototype
if(typeof a=="function")return J.aF.prototype
if(typeof a=="object"){if(a instanceof A.c){return a}else{return J.aq.prototype}}if(!(a instanceof A.c))return J.a0.prototype
return a},
dR(a){if(a==null)return a
if(Array.isArray(a))return J.e.prototype
if(!(a instanceof A.c))return J.a0.prototype
return a},
hq(a){if(typeof a=="string")return J.a6.prototype
if(a==null)return a
if(Array.isArray(a))return J.e.prototype
if(!(a instanceof A.c))return J.a0.prototype
return a},
hr(a){if(typeof a=="number")return J.ao.prototype
if(typeof a=="string")return J.a6.prototype
if(a==null)return a
if(!(a instanceof A.c))return J.a0.prototype
return a},
cG(a,b){if(a==null)return b==null
if(typeof a!="object")return b!=null&&a===b
return J.ah(a).G(a,b)},
ec(a,b){return J.hr(a).k(a,b)},
ed(a,b){return J.dR(a).E(a,b)},
bH(a){return J.ah(a).gp(a)},
d_(a){return J.dR(a).gt(a)},
ee(a){return J.hq(a).gm(a)},
ef(a){return J.ah(a).gF(a)},
b_(a){return J.ah(a).j(a)},
bb:function bb(){},
bd:function bd(){},
aE:function aE(){},
aq:function aq(){},
Y:function Y(){},
cd:function cd(){},
a0:function a0(){},
aF:function aF(){},
e:function e(a){this.$ti=a},
bc:function bc(){},
bX:function bX(a){this.$ti=a},
ak:function ak(a,b,c){var _=this
_.a=a
_.b=b
_.c=0
_.d=null
_.$ti=c},
ao:function ao(){},
aD:function aD(){},
be:function be(){},
a6:function a6(){}},A={cI:function cI(){},
dq(a,b){a=a+b&536870911
a=a+((a&524287)<<10)&536870911
return a^a>>>6},
eU(a){a=a+((a&67108863)<<3)&536870911
a^=a>>>11
return a+((a&16383)<<15)&536870911},
cW(a){var t,s
for(t=$.af.length,s=0;s<t;++s)if(a===$.af[s])return!0
return!1},
eK(a,b,c,d){if(u.Q.b(a))return new A.aB(a,b,c.i("@<0>").N(d).i("aB<1,2>"))
return new A.a8(a,b,c.i("@<0>").N(d).i("a8<1,2>"))},
cH(){return new A.bs("No element")},
bi:function bi(a){this.a=a},
cf:function cf(){},
k:function k(){},
j:function j(){},
aO:function aO(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.$ti=d},
ar:function ar(a,b,c){var _=this
_.a=a
_.b=b
_.c=0
_.d=null
_.$ti=c},
a8:function a8(a,b,c){this.a=a
this.b=b
this.$ti=c},
aB:function aB(a,b,c){this.a=a
this.b=b
this.$ti=c},
bl:function bl(a,b,c){var _=this
_.a=null
_.b=a
_.c=b
_.$ti=c},
i:function i(a,b,c){this.a=a
this.b=b
this.$ti=c},
dY(a){var t=v.mangledGlobalNames[a]
if(t!=null)return t
return"minified:"+a},
m(a){var t
if(typeof a=="string")return a
if(typeof a=="number"){if(a!==0)return""+a}else if(!0===a)return"true"
else if(!1===a)return"false"
else if(a==null)return"null"
t=J.b_(a)
return t},
bo(a){var t,s=$.df
if(s==null)s=$.df=Symbol("identityHashCode")
t=a[s]
if(t==null){t=Math.random()*0x3fffffff|0
a[s]=t}return t},
eP(a,b){var t,s=/^\s*[+-]?((0x[a-f0-9]+)|(\d+)|([a-z0-9]+))\s*$/i.exec(a)
if(s==null)return null
t=s[3]
if(t!=null)return parseInt(a,10)
if(s[2]!=null)return parseInt(a,16)
return null},
bp(a){var t,s,r,q
if(a instanceof A.c)return A.y(A.bF(a),null)
t=J.ah(a)
if(t===B.J||t===B.K||u.B.b(a)){s=B.t(a)
if(s!=="Object"&&s!=="")return s
r=a.constructor
if(typeof r=="function"){q=r.name
if(typeof q=="string"&&q!=="Object"&&q!=="")return q}}return A.y(A.bF(a),null)},
eQ(a){var t,s,r
if(typeof a=="number"||A.cT(a))return J.b_(a)
if(typeof a=="string")return JSON.stringify(a)
if(a instanceof A.a4)return a.j(0)
t=$.eb()
for(s=0;s<1;++s){r=t[s].aH(a)
if(r!=null)return r}return"Instance of '"+A.bp(a)+"'"},
p(a){var t
if(a<=65535)return String.fromCharCode(a)
if(a<=1114111){t=a-65536
return String.fromCharCode((B.a.a7(t,10)|55296)>>>0,t&1023|56320)}throw A.b(A.aK(a,0,1114111,null,null))},
dk(a,b,c,d,e,f,g,h,i){var t,s,r,q=b-1
if(0<=a&&a<100){a+=400
q-=4800}t=B.a.L(h,1000)
g+=B.a.v(h-t,1000)
s=i?Date.UTC(a,q,c,d,e,f,g):new Date(a,q,c,d,e,f,g).valueOf()
r=!0
if(!isNaN(s))if(!(s<-864e13))if(!(s>864e13))r=s===864e13&&t!==0
if(r)return null
return s},
u(a){if(a.date===void 0)a.date=new Date(a.a)
return a.date},
H(a){return a.c?A.u(a).getUTCFullYear()+0:A.u(a).getFullYear()+0},
Q(a){return a.c?A.u(a).getUTCMonth()+1:A.u(a).getMonth()+1},
as(a){return a.c?A.u(a).getUTCDate()+0:A.u(a).getDate()+0},
dg(a){return a.c?A.u(a).getUTCHours()+0:A.u(a).getHours()+0},
di(a){return a.c?A.u(a).getUTCMinutes()+0:A.u(a).getMinutes()+0},
dj(a){return a.c?A.u(a).getUTCSeconds()+0:A.u(a).getSeconds()+0},
dh(a){return a.c?A.u(a).getUTCMilliseconds()+0:A.u(a).getMilliseconds()+0},
cL(a){return B.a.L((a.c?A.u(a).getUTCDay()+0:A.u(a).getDay()+0)+6,7)+1},
h_(a){return new A.V(!0,a,null,null)},
b(a){return A.q(a,new Error())},
q(a,b){var t
if(a==null)a=new A.aQ()
b.dartException=a
t=A.hJ
if("defineProperty" in Object){Object.defineProperty(b,"message",{get:t})
b.name=""}else b.toString=t
return b},
hJ(){return J.b_(this.dartException)},
cF(a,b){throw A.q(a,b==null?new Error():b)},
hI(a,b,c){var t
if(b==null)b=0
if(c==null)c=0
t=Error()
A.cF(A.fr(a,b,c),t)},
fr(a,b,c){var t,s,r,q,p,o,n,m,l
if(typeof b=="string")t=b
else{s="[]=;add;removeWhere;retainWhere;removeRange;setRange;setInt8;setInt16;setInt32;setUint8;setUint16;setUint32;setFloat32;setFloat64".split(";")
r=s.length
q=b
if(q>r){c=q/r|0
q%=r}t=s[q]}p=typeof c=="string"?c:"modify;remove from;add to".split(";")[c]
o=u.j.b(a)?"list":"ByteData"
n=a.$flags|0
m="a "
if((n&4)!==0)l="constant "
else if((n&2)!==0){l="unmodifiable "
m="an "}else l=(n&1)!==0?"fixed-length ":""
return new A.aR("'"+t+"': Cannot "+p+" "+m+l+o)},
r(a){throw A.b(A.W(a))},
S(a){var t,s,r,q,p,o
a=A.hA(a.replace(String({}),"$receiver$"))
t=a.match(/\\\$[a-zA-Z]+\\\$/g)
if(t==null)t=A.d([],u.s)
s=t.indexOf("\\$arguments\\$")
r=t.indexOf("\\$argumentsExpr\\$")
q=t.indexOf("\\$expr\\$")
p=t.indexOf("\\$method\\$")
o=t.indexOf("\\$receiver\\$")
return new A.ck(a.replace(new RegExp("\\\\\\$arguments\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$argumentsExpr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$expr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$method\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$receiver\\\\\\$","g"),"((?:x|[^x])*)"),s,r,q,p,o)},
cl(a){return function($expr$){var $argumentsExpr$="$arguments$"
try{$expr$.$method$($argumentsExpr$)}catch(t){return t.message}}(a)},
dr(a){return function($expr$){try{$expr$.$method$}catch(t){return t.message}}(a)},
cJ(a,b){var t=b==null,s=t?null:b.method
return new A.bg(a,s,t?null:b.receiver)},
cY(a){if(a==null)return new A.cc(a)
if(typeof a!=="object")return a
if("dartException" in a)return A.aj(a,a.dartException)
return A.fX(a)},
aj(a,b){if(u.C.b(b))if(b.$thrownJsError==null)b.$thrownJsError=a
return b},
fX(a){var t,s,r,q,p,o,n,m,l,k,j,i,h
if(!("message" in a))return a
t=a.message
if("number" in a&&typeof a.number=="number"){s=a.number
r=s&65535
if((B.a.a7(s,16)&8191)===10)switch(r){case 438:return A.aj(a,A.cJ(A.m(t)+" (Error "+r+")",null))
case 445:case 5007:A.m(t)
return A.aj(a,new A.aI())}}if(a instanceof TypeError){q=$.e0()
p=$.e1()
o=$.e2()
n=$.e3()
m=$.e6()
l=$.e7()
k=$.e5()
$.e4()
j=$.e9()
i=$.e8()
h=q.C(t)
if(h!=null)return A.aj(a,A.cJ(t,h))
else{h=p.C(t)
if(h!=null){h.method="call"
return A.aj(a,A.cJ(t,h))}else if(o.C(t)!=null||n.C(t)!=null||m.C(t)!=null||l.C(t)!=null||k.C(t)!=null||n.C(t)!=null||j.C(t)!=null||i.C(t)!=null)return A.aj(a,new A.aI())}return A.aj(a,new A.bw(typeof t=="string"?t:""))}if(a instanceof RangeError){if(typeof t=="string"&&t.indexOf("call stack")!==-1)return new A.aM()
t=function(b){try{return String(b)}catch(g){}return null}(a)
return A.aj(a,new A.V(!1,null,null,typeof t=="string"?t.replace(/^RangeError:\s*/,""):t))}if(typeof InternalError=="function"&&a instanceof InternalError)if(typeof t=="string"&&t==="too much recursion")return new A.aM()
return a},
dV(a){if(a==null)return J.bH(a)
if(typeof a=="object")return A.bo(a)
return J.bH(a)},
hn(a,b){var t,s,r,q=a.length
for(t=0;t<q;t=r){s=t+1
r=s+1
b.B(0,a[t],a[s])}return b},
fA(a,b,c,d,e,f){switch(b){case 0:return a.$0()
case 1:return a.$1(c)
case 2:return a.$2(c,d)
case 3:return a.$3(c,d,e)
case 4:return a.$4(c,d,e,f)}throw A.b(new A.cn("Unsupported number of arguments for wrapped closure"))},
hg(a,b){var t=a.$identity
if(!!t)return t
t=A.hh(a,b)
a.$identity=t
return t},
hh(a,b){var t
switch(b){case 0:t=a.$0
break
case 1:t=a.$1
break
case 2:t=a.$2
break
case 3:t=a.$3
break
case 4:t=a.$4
break
default:t=null}if(t!=null)return t.bind(a)
return function(c,d,e){return function(f,g,h,i){return e(c,d,f,g,h,i)}}(a,b,A.fA)},
eo(a1){var t,s,r,q,p,o,n,m,l,k,j=a1.co,i=a1.iS,h=a1.iI,g=a1.nDA,f=a1.aI,e=a1.fs,d=a1.cs,c=e[0],b=d[0],a=j[c],a0=a1.fT
a0.toString
t=i?Object.create(new A.ch().constructor.prototype):Object.create(new A.az(null,null).constructor.prototype)
t.$initialize=t.constructor
s=i?function static_tear_off(){this.$initialize()}:function tear_off(a2,a3){this.$initialize(a2,a3)}
t.constructor=s
s.prototype=t
t.$_name=c
t.$_target=a
r=!i
if(r)q=A.d4(c,a,h,g)
else{t.$static_name=c
q=a}t.$S=A.ek(a0,i,h)
t[b]=q
for(p=q,o=1;o<e.length;++o){n=e[o]
if(typeof n=="string"){m=j[n]
l=n
n=m}else l=""
k=d[o]
if(k!=null){if(r)n=A.d4(l,n,h,g)
t[k]=n}if(o===f)p=n}t.$C=p
t.$R=a1.rC
t.$D=a1.dV
return s},
ek(a,b,c){if(typeof a=="number")return a
if(typeof a=="string"){if(b)throw A.b("Cannot compute signature for static tearoff.")
return function(d,e){return function(){return e(this,d)}}(a,A.eh)}throw A.b("Error in functionType of tearoff")},
el(a,b,c,d){var t=A.d3
switch(b?-1:a){case 0:return function(e,f){return function(){return f(this)[e]()}}(c,t)
case 1:return function(e,f){return function(g){return f(this)[e](g)}}(c,t)
case 2:return function(e,f){return function(g,h){return f(this)[e](g,h)}}(c,t)
case 3:return function(e,f){return function(g,h,i){return f(this)[e](g,h,i)}}(c,t)
case 4:return function(e,f){return function(g,h,i,j){return f(this)[e](g,h,i,j)}}(c,t)
case 5:return function(e,f){return function(g,h,i,j,k){return f(this)[e](g,h,i,j,k)}}(c,t)
default:return function(e,f){return function(){return e.apply(f(this),arguments)}}(d,t)}},
d4(a,b,c,d){if(c)return A.en(a,b,d)
return A.el(b.length,d,a,b)},
em(a,b,c,d){var t=A.d3,s=A.ei
switch(b?-1:a){case 0:throw A.b(new A.br("Intercepted function with no arguments."))
case 1:return function(e,f,g){return function(){return f(this)[e](g(this))}}(c,s,t)
case 2:return function(e,f,g){return function(h){return f(this)[e](g(this),h)}}(c,s,t)
case 3:return function(e,f,g){return function(h,i){return f(this)[e](g(this),h,i)}}(c,s,t)
case 4:return function(e,f,g){return function(h,i,j){return f(this)[e](g(this),h,i,j)}}(c,s,t)
case 5:return function(e,f,g){return function(h,i,j,k){return f(this)[e](g(this),h,i,j,k)}}(c,s,t)
case 6:return function(e,f,g){return function(h,i,j,k,l){return f(this)[e](g(this),h,i,j,k,l)}}(c,s,t)
default:return function(e,f,g){return function(){var r=[g(this)]
Array.prototype.push.apply(r,arguments)
return e.apply(f(this),r)}}(d,s,t)}},
en(a,b,c){var t,s
if($.d1==null)$.d1=A.d0("interceptor")
if($.d2==null)$.d2=A.d0("receiver")
t=b.length
s=A.em(t,c,a,b)
return s},
cV(a){return A.eo(a)},
eh(a,b){return A.cv(v.typeUniverse,A.bF(a.a),b)},
d3(a){return a.a},
ei(a){return a.b},
d0(a){var t,s,r,q=new A.az("receiver","interceptor"),p=Object.getOwnPropertyNames(q)
p.$flags=1
t=p
for(p=t.length,s=0;s<p;++s){r=t[s]
if(q[r]===a)return r}throw A.b(A.bI("Field name "+a+" not found."))},
dS(a){return v.getIsolateTag(a)},
hj(a,b){var t=b.length,s=v.rttc[""+t+";"+a]
if(s==null)return null
if(t===0)return s
if(t===s.length)return s.apply(null,b)
return s(b)},
eC(a,b,c,d,e,f){var t=function(g,h){try{return new RegExp(g,h)}catch(s){return s}}(a,""+""+""+""+f)
if(t instanceof RegExp)return t
throw A.b(A.b9("Illegal RegExp pattern ("+String(t)+")",a))},
hA(a){if(/[[\]{}()*+?.\\^$|]/.test(a))return a.replace(/[[\]{}()*+?.\\^$|]/g,"\\$&")
return a},
aL:function aL(){},
ck:function ck(a,b,c,d,e,f){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f},
aI:function aI(){},
bg:function bg(a,b,c){this.a=a
this.b=b
this.c=c},
bw:function bw(a){this.a=a},
cc:function cc(a){this.a=a},
a4:function a4(){},
bJ:function bJ(){},
bK:function bK(){},
ci:function ci(){},
ch:function ch(){},
az:function az(a,b){this.a=a
this.b=b},
br:function br(a){this.a=a},
L:function L(a){var _=this
_.a=0
_.f=_.e=_.d=_.c=_.b=null
_.r=0
_.$ti=a},
c9:function c9(a,b){this.a=a
this.b=b
this.c=null},
N:function N(a,b){this.a=a
this.$ti=b},
bk:function bk(a,b,c){var _=this
_.a=a
_.b=b
_.c=c
_.d=null},
M:function M(a,b){this.a=a
this.$ti=b},
bj:function bj(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=null
_.$ti=d},
bW:function bW(a,b){this.a=a
this.b=b},
cs:function cs(a){this.b=a},
cN(a,b){var t=b.c
return t==null?b.c=A.aW(a,"d7",[b.x]):t},
dm(a){var t=a.w
if(t===6||t===7)return A.dm(a.x)
return t===11||t===12},
eT(a){return a.as},
a3(a){return A.cu(v.typeUniverse,a,!1)},
ae(a0,a1,a2,a3){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a=a1.w
switch(a){case 5:case 1:case 2:case 3:case 4:return a1
case 6:t=a1.x
s=A.ae(a0,t,a2,a3)
if(s===t)return a1
return A.dA(a0,s,!0)
case 7:t=a1.x
s=A.ae(a0,t,a2,a3)
if(s===t)return a1
return A.dz(a0,s,!0)
case 8:r=a1.y
q=A.aw(a0,r,a2,a3)
if(q===r)return a1
return A.aW(a0,a1.x,q)
case 9:p=a1.x
o=A.ae(a0,p,a2,a3)
n=a1.y
m=A.aw(a0,n,a2,a3)
if(o===p&&m===n)return a1
return A.cQ(a0,o,m)
case 10:l=a1.x
k=a1.y
j=A.aw(a0,k,a2,a3)
if(j===k)return a1
return A.dB(a0,l,j)
case 11:i=a1.x
h=A.ae(a0,i,a2,a3)
g=a1.y
f=A.fU(a0,g,a2,a3)
if(h===i&&f===g)return a1
return A.dy(a0,h,f)
case 12:e=a1.y
a3+=e.length
d=A.aw(a0,e,a2,a3)
p=a1.x
o=A.ae(a0,p,a2,a3)
if(d===e&&o===p)return a1
return A.cR(a0,o,d,!0)
case 13:c=a1.x
if(c<a3)return a1
b=a2[c-a3]
if(b==null)return a1
return b
default:throw A.b(A.b1("Attempted to substitute unexpected RTI kind "+a))}},
aw(a,b,c,d){var t,s,r,q,p=b.length,o=A.cw(p)
for(t=!1,s=0;s<p;++s){r=b[s]
q=A.ae(a,r,c,d)
if(q!==r)t=!0
o[s]=q}return t?o:b},
fV(a,b,c,d){var t,s,r,q,p,o,n=b.length,m=A.cw(n)
for(t=!1,s=0;s<n;s+=3){r=b[s]
q=b[s+1]
p=b[s+2]
o=A.ae(a,p,c,d)
if(o!==p)t=!0
m.splice(s,3,r,q,o)}return t?m:b},
fU(a,b,c,d){var t,s=b.a,r=A.aw(a,s,c,d),q=b.b,p=A.aw(a,q,c,d),o=b.c,n=A.fV(a,o,c,d)
if(r===s&&p===q&&n===o)return b
t=new A.bz()
t.a=r
t.b=p
t.c=n
return t},
d(a,b){a[v.arrayRti]=b
return a},
dQ(a){var t=a.$S
if(t!=null){if(typeof t=="number")return A.ht(t)
return a.$S()}return null},
hv(a,b){var t
if(A.dm(b))if(a instanceof A.a4){t=A.dQ(a)
if(t!=null)return t}return A.bF(a)},
bF(a){if(a instanceof A.c)return A.x(a)
if(Array.isArray(a))return A.t(a)
return A.cS(J.ah(a))},
t(a){var t=a[v.arrayRti],s=u.b
if(t==null)return s
if(t.constructor!==s.constructor)return s
return t},
x(a){var t=a.$ti
return t!=null?t:A.cS(a)},
cS(a){var t=a.constructor,s=t.$ccache
if(s!=null)return s
return A.fy(a,t)},
fy(a,b){var t=a instanceof A.a4?Object.getPrototypeOf(Object.getPrototypeOf(a)).constructor:b,s=A.fb(v.typeUniverse,t.name)
b.$ccache=s
return s},
ht(a){var t,s=v.types,r=s[a]
if(typeof r=="string"){t=A.cu(v.typeUniverse,r,!1)
s[a]=t
return t}return r},
hs(a){return A.ag(A.x(a))},
fT(a){var t=a instanceof A.a4?A.dQ(a):null
if(t!=null)return t
if(u.l.b(a))return J.ef(a).a
if(Array.isArray(a))return A.t(a)
return A.bF(a)},
ag(a){var t=a.r
return t==null?a.r=new A.ct(a):t},
hL(a){return A.ag(A.cu(v.typeUniverse,a,!1))},
fx(a){var t=this
t.b=A.fS(t)
return t.b(a)},
fS(a){var t,s,r,q
if(a===u.K)return A.fH
if(A.ai(a))return A.fL
t=a.w
if(t===6)return A.fv
if(t===1)return A.dK
if(t===7)return A.fB
s=A.fR(a)
if(s!=null)return s
if(t===8){r=a.x
if(a.y.every(A.ai)){a.f="$i"+r
if(r==="Z")return A.fF
if(a===u.m)return A.fE
return A.fK}}else if(t===10){q=A.hj(a.x,a.y)
return q==null?A.dK:q}return A.ft},
fR(a){if(a.w===8){if(a===u.S)return A.fC
if(a===u.i||a===u.H)return A.fG
if(a===u.N)return A.fJ
if(a===u.y)return A.cT}return null},
fw(a){var t=this,s=A.fs
if(A.ai(t))s=A.fn
else if(t===u.K)s=A.fm
else if(A.ax(t)){s=A.fu
if(t===u.E)s=A.fi
else if(t===u.v)s=A.a2
else if(t===u.u)s=A.fe
else if(t===u.F)s=A.bC
else if(t===u.w)s=A.fg
else if(t===u.D)s=A.fk}else if(t===u.S)s=A.fh
else if(t===u.N)s=A.dE
else if(t===u.y)s=A.fd
else if(t===u.H)s=A.fl
else if(t===u.i)s=A.ff
else if(t===u.m)s=A.fj
t.a=s
return t.a(a)},
ft(a){var t=this
if(a==null)return A.ax(t)
return A.hw(v.typeUniverse,A.hv(a,t),t)},
fv(a){if(a==null)return!0
return this.x.b(a)},
fK(a){var t,s=this
if(a==null)return A.ax(s)
t=s.f
if(a instanceof A.c)return!!a[t]
return!!J.ah(a)[t]},
fF(a){var t,s=this
if(a==null)return A.ax(s)
if(typeof a!="object")return!1
if(Array.isArray(a))return!0
t=s.f
if(a instanceof A.c)return!!a[t]
return!!J.ah(a)[t]},
fE(a){var t=this
if(a==null)return!1
if(typeof a=="object"){if(a instanceof A.c)return!!a[t.f]
return!0}if(typeof a=="function")return!0
return!1},
dJ(a){if(typeof a=="object"){if(a instanceof A.c)return u.m.b(a)
return!0}if(typeof a=="function")return!0
return!1},
fs(a){var t=this
if(a==null){if(A.ax(t))return a}else if(t.b(a))return a
throw A.q(A.dF(a,t),new Error())},
fu(a){var t=this
if(a==null||t.b(a))return a
throw A.q(A.dF(a,t),new Error())},
dF(a,b){return new A.aU("TypeError: "+A.ds(a,A.y(b,null)))},
ds(a,b){return A.b6(a)+": type '"+A.y(A.fT(a),null)+"' is not a subtype of type '"+b+"'"},
D(a,b){return new A.aU("TypeError: "+A.ds(a,b))},
fB(a){var t=this
return t.x.b(a)||A.cN(v.typeUniverse,t).b(a)},
fH(a){return a!=null},
fm(a){if(a!=null)return a
throw A.q(A.D(a,"Object"),new Error())},
fL(a){return!0},
fn(a){return a},
dK(a){return!1},
cT(a){return!0===a||!1===a},
fd(a){if(!0===a)return!0
if(!1===a)return!1
throw A.q(A.D(a,"bool"),new Error())},
fe(a){if(!0===a)return!0
if(!1===a)return!1
if(a==null)return a
throw A.q(A.D(a,"bool?"),new Error())},
ff(a){if(typeof a=="number")return a
throw A.q(A.D(a,"double"),new Error())},
fg(a){if(typeof a=="number")return a
if(a==null)return a
throw A.q(A.D(a,"double?"),new Error())},
fC(a){return typeof a=="number"&&Math.floor(a)===a},
fh(a){if(typeof a=="number"&&Math.floor(a)===a)return a
throw A.q(A.D(a,"int"),new Error())},
fi(a){if(typeof a=="number"&&Math.floor(a)===a)return a
if(a==null)return a
throw A.q(A.D(a,"int?"),new Error())},
fG(a){return typeof a=="number"},
fl(a){if(typeof a=="number")return a
throw A.q(A.D(a,"num"),new Error())},
bC(a){if(typeof a=="number")return a
if(a==null)return a
throw A.q(A.D(a,"num?"),new Error())},
fJ(a){return typeof a=="string"},
dE(a){if(typeof a=="string")return a
throw A.q(A.D(a,"String"),new Error())},
a2(a){if(typeof a=="string")return a
if(a==null)return a
throw A.q(A.D(a,"String?"),new Error())},
fj(a){if(A.dJ(a))return a
throw A.q(A.D(a,"JSObject"),new Error())},
fk(a){if(a==null)return a
if(A.dJ(a))return a
throw A.q(A.D(a,"JSObject?"),new Error())},
dM(a,b){var t,s,r
for(t="",s="",r=0;r<a.length;++r,s=", ")t+=s+A.y(a[r],b)
return t},
fQ(a,b){var t,s,r,q,p,o,n=a.x,m=a.y
if(""===n)return"("+A.dM(m,b)+")"
t=m.length
s=n.split(",")
r=s.length-t
for(q="(",p="",o=0;o<t;++o,p=", "){q+=p
if(r===0)q+="{"
q+=A.y(m[o],b)
if(r>=0)q+=" "+s[r];++r}return q+"})"},
dH(a0,a1,a2){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b=", ",a=null
if(a2!=null){t=a2.length
if(a1==null)a1=A.d([],u.s)
else a=a1.length
s=a1.length
for(r=t;r>0;--r)a1.push("T"+(s+r))
for(q=u.X,p="<",o="",r=0;r<t;++r,o=b){p=p+o+a1[a1.length-1-r]
n=a2[r]
m=n.w
if(!(m===2||m===3||m===4||m===5||n===q))p+=" extends "+A.y(n,a1)}p+=">"}else p=""
q=a0.x
l=a0.y
k=l.a
j=k.length
i=l.b
h=i.length
g=l.c
f=g.length
e=A.y(q,a1)
for(d="",c="",r=0;r<j;++r,c=b)d+=c+A.y(k[r],a1)
if(h>0){d+=c+"["
for(c="",r=0;r<h;++r,c=b)d+=c+A.y(i[r],a1)
d+="]"}if(f>0){d+=c+"{"
for(c="",r=0;r<f;r+=3,c=b){d+=c
if(g[r+1])d+="required "
d+=A.y(g[r+2],a1)+" "+g[r]}d+="}"}if(a!=null){a1.toString
a1.length=a}return p+"("+d+") => "+e},
y(a,b){var t,s,r,q,p,o,n=a.w
if(n===5)return"erased"
if(n===2)return"dynamic"
if(n===3)return"void"
if(n===1)return"Never"
if(n===4)return"any"
if(n===6){t=a.x
s=A.y(t,b)
r=t.w
return(r===11||r===12?"("+s+")":s)+"?"}if(n===7)return"FutureOr<"+A.y(a.x,b)+">"
if(n===8){q=A.fW(a.x)
p=a.y
return p.length>0?q+("<"+A.dM(p,b)+">"):q}if(n===10)return A.fQ(a,b)
if(n===11)return A.dH(a,b,null)
if(n===12)return A.dH(a.x,b,a.y)
if(n===13){o=a.x
return b[b.length-1-o]}return"?"},
fW(a){var t=v.mangledGlobalNames[a]
if(t!=null)return t
return"minified:"+a},
fc(a,b){var t=a.tR[b]
while(typeof t=="string")t=a.tR[t]
return t},
fb(a,b){var t,s,r,q,p,o=a.eT,n=o[b]
if(n==null)return A.cu(a,b,!1)
else if(typeof n=="number"){t=n
s=A.aX(a,5,"#")
r=A.cw(t)
for(q=0;q<t;++q)r[q]=s
p=A.aW(a,b,r)
o[b]=p
return p}else return n},
f9(a,b){return A.dC(a.tR,b)},
f8(a,b){return A.dC(a.eT,b)},
cu(a,b,c){var t,s=a.eC,r=s.get(b)
if(r!=null)return r
t=A.dw(A.du(a,null,b,!1))
s.set(b,t)
return t},
cv(a,b,c){var t,s,r=b.z
if(r==null)r=b.z=new Map()
t=r.get(c)
if(t!=null)return t
s=A.dw(A.du(a,b,c,!0))
r.set(c,s)
return s},
fa(a,b,c){var t,s,r,q=b.Q
if(q==null)q=b.Q=new Map()
t=c.as
s=q.get(t)
if(s!=null)return s
r=A.cQ(a,b,c.w===9?c.y:[c])
q.set(t,r)
return r},
a1(a,b){b.a=A.fw
b.b=A.fx
return b},
aX(a,b,c){var t,s,r=a.eC.get(c)
if(r!=null)return r
t=new A.F(null,null)
t.w=b
t.as=c
s=A.a1(a,t)
a.eC.set(c,s)
return s},
dA(a,b,c){var t,s=b.as+"?",r=a.eC.get(s)
if(r!=null)return r
t=A.f6(a,b,s,c)
a.eC.set(s,t)
return t},
f6(a,b,c,d){var t,s,r
if(d){t=b.w
s=!0
if(!A.ai(b))if(!(b===u.a||b===u.T))if(t!==6)s=t===7&&A.ax(b.x)
if(s)return b
else if(t===1)return u.a}r=new A.F(null,null)
r.w=6
r.x=b
r.as=c
return A.a1(a,r)},
dz(a,b,c){var t,s=b.as+"/",r=a.eC.get(s)
if(r!=null)return r
t=A.f4(a,b,s,c)
a.eC.set(s,t)
return t},
f4(a,b,c,d){var t,s
if(d){t=b.w
if(A.ai(b)||b===u.K)return b
else if(t===1)return A.aW(a,"d7",[b])
else if(b===u.a||b===u.T)return u.d}s=new A.F(null,null)
s.w=7
s.x=b
s.as=c
return A.a1(a,s)},
f7(a,b){var t,s,r=""+b+"^",q=a.eC.get(r)
if(q!=null)return q
t=new A.F(null,null)
t.w=13
t.x=b
t.as=r
s=A.a1(a,t)
a.eC.set(r,s)
return s},
aV(a){var t,s,r,q=a.length
for(t="",s="",r=0;r<q;++r,s=",")t+=s+a[r].as
return t},
f3(a){var t,s,r,q,p,o=a.length
for(t="",s="",r=0;r<o;r+=3,s=","){q=a[r]
p=a[r+1]?"!":":"
t+=s+q+p+a[r+2].as}return t},
aW(a,b,c){var t,s,r,q=b
if(c.length>0)q+="<"+A.aV(c)+">"
t=a.eC.get(q)
if(t!=null)return t
s=new A.F(null,null)
s.w=8
s.x=b
s.y=c
if(c.length>0)s.c=c[0]
s.as=q
r=A.a1(a,s)
a.eC.set(q,r)
return r},
cQ(a,b,c){var t,s,r,q,p,o
if(b.w===9){t=b.x
s=b.y.concat(c)}else{s=c
t=b}r=t.as+(";<"+A.aV(s)+">")
q=a.eC.get(r)
if(q!=null)return q
p=new A.F(null,null)
p.w=9
p.x=t
p.y=s
p.as=r
o=A.a1(a,p)
a.eC.set(r,o)
return o},
dB(a,b,c){var t,s,r="+"+(b+"("+A.aV(c)+")"),q=a.eC.get(r)
if(q!=null)return q
t=new A.F(null,null)
t.w=10
t.x=b
t.y=c
t.as=r
s=A.a1(a,t)
a.eC.set(r,s)
return s},
dy(a,b,c){var t,s,r,q,p,o=b.as,n=c.a,m=n.length,l=c.b,k=l.length,j=c.c,i=j.length,h="("+A.aV(n)
if(k>0){t=m>0?",":""
h+=t+"["+A.aV(l)+"]"}if(i>0){t=m>0?",":""
h+=t+"{"+A.f3(j)+"}"}s=o+(h+")")
r=a.eC.get(s)
if(r!=null)return r
q=new A.F(null,null)
q.w=11
q.x=b
q.y=c
q.as=s
p=A.a1(a,q)
a.eC.set(s,p)
return p},
cR(a,b,c,d){var t,s=b.as+("<"+A.aV(c)+">"),r=a.eC.get(s)
if(r!=null)return r
t=A.f5(a,b,c,s,d)
a.eC.set(s,t)
return t},
f5(a,b,c,d,e){var t,s,r,q,p,o,n,m
if(e){t=c.length
s=A.cw(t)
for(r=0,q=0;q<t;++q){p=c[q]
if(p.w===1){s[q]=p;++r}}if(r>0){o=A.ae(a,b,s,0)
n=A.aw(a,c,s,0)
return A.cR(a,o,n,c!==n)}}m=new A.F(null,null)
m.w=12
m.x=b
m.y=c
m.as=d
return A.a1(a,m)},
du(a,b,c,d){return{u:a,e:b,r:c,s:[],p:0,n:d}},
dw(a){var t,s,r,q,p,o,n,m=a.r,l=a.s
for(t=m.length,s=0;s<t;){r=m.charCodeAt(s)
if(r>=48&&r<=57)s=A.eZ(s+1,r,m,l)
else if((((r|32)>>>0)-97&65535)<26||r===95||r===36||r===124)s=A.dv(a,s,m,l,!1)
else if(r===46)s=A.dv(a,s,m,l,!0)
else{++s
switch(r){case 44:break
case 58:l.push(!1)
break
case 33:l.push(!0)
break
case 59:l.push(A.ad(a.u,a.e,l.pop()))
break
case 94:l.push(A.f7(a.u,l.pop()))
break
case 35:l.push(A.aX(a.u,5,"#"))
break
case 64:l.push(A.aX(a.u,2,"@"))
break
case 126:l.push(A.aX(a.u,3,"~"))
break
case 60:l.push(a.p)
a.p=l.length
break
case 62:A.f0(a,l)
break
case 38:A.f_(a,l)
break
case 63:q=a.u
l.push(A.dA(q,A.ad(q,a.e,l.pop()),a.n))
break
case 47:q=a.u
l.push(A.dz(q,A.ad(q,a.e,l.pop()),a.n))
break
case 40:l.push(-3)
l.push(a.p)
a.p=l.length
break
case 41:A.eY(a,l)
break
case 91:l.push(a.p)
a.p=l.length
break
case 93:p=l.splice(a.p)
A.dx(a.u,a.e,p)
a.p=l.pop()
l.push(p)
l.push(-1)
break
case 123:l.push(a.p)
a.p=l.length
break
case 125:p=l.splice(a.p)
A.f2(a.u,a.e,p)
a.p=l.pop()
l.push(p)
l.push(-2)
break
case 43:o=m.indexOf("(",s)
l.push(m.substring(s,o))
l.push(-4)
l.push(a.p)
a.p=l.length
s=o+1
break
default:throw"Bad character "+r}}}n=l.pop()
return A.ad(a.u,a.e,n)},
eZ(a,b,c,d){var t,s,r=b-48
for(t=c.length;a<t;++a){s=c.charCodeAt(a)
if(!(s>=48&&s<=57))break
r=r*10+(s-48)}d.push(r)
return a},
dv(a,b,c,d,e){var t,s,r,q,p,o,n=b+1
for(t=c.length;n<t;++n){s=c.charCodeAt(n)
if(s===46){if(e)break
e=!0}else{if(!((((s|32)>>>0)-97&65535)<26||s===95||s===36||s===124))r=s>=48&&s<=57
else r=!0
if(!r)break}}q=c.substring(b,n)
if(e){t=a.u
p=a.e
if(p.w===9)p=p.x
o=A.fc(t,p.x)[q]
if(o==null)A.cF('No "'+q+'" in "'+A.eT(p)+'"')
d.push(A.cv(t,p,o))}else d.push(q)
return n},
f0(a,b){var t,s=a.u,r=A.dt(a,b),q=b.pop()
if(typeof q=="string")b.push(A.aW(s,q,r))
else{t=A.ad(s,a.e,q)
switch(t.w){case 11:b.push(A.cR(s,t,r,a.n))
break
default:b.push(A.cQ(s,t,r))
break}}},
eY(a,b){var t,s,r,q=a.u,p=b.pop(),o=null,n=null
if(typeof p=="number")switch(p){case-1:o=b.pop()
break
case-2:n=b.pop()
break
default:b.push(p)
break}else b.push(p)
t=A.dt(a,b)
p=b.pop()
switch(p){case-3:p=b.pop()
if(o==null)o=q.sEA
if(n==null)n=q.sEA
s=A.ad(q,a.e,p)
r=new A.bz()
r.a=t
r.b=o
r.c=n
b.push(A.dy(q,s,r))
return
case-4:b.push(A.dB(q,b.pop(),t))
return
default:throw A.b(A.b1("Unexpected state under `()`: "+A.m(p)))}},
f_(a,b){var t=b.pop()
if(0===t){b.push(A.aX(a.u,1,"0&"))
return}if(1===t){b.push(A.aX(a.u,4,"1&"))
return}throw A.b(A.b1("Unexpected extended operation "+A.m(t)))},
dt(a,b){var t=b.splice(a.p)
A.dx(a.u,a.e,t)
a.p=b.pop()
return t},
ad(a,b,c){if(typeof c=="string")return A.aW(a,c,a.sEA)
else if(typeof c=="number"){b.toString
return A.f1(a,b,c)}else return c},
dx(a,b,c){var t,s=c.length
for(t=0;t<s;++t)c[t]=A.ad(a,b,c[t])},
f2(a,b,c){var t,s=c.length
for(t=2;t<s;t+=3)c[t]=A.ad(a,b,c[t])},
f1(a,b,c){var t,s,r=b.w
if(r===9){if(c===0)return b.x
t=b.y
s=t.length
if(c<=s)return t[c-1]
c-=s
b=b.x
r=b.w}else if(c===0)return b
if(r!==8)throw A.b(A.b1("Indexed base must be an interface type"))
t=b.y
if(c<=t.length)return t[c-1]
throw A.b(A.b1("Bad index "+c+" for "+b.j(0)))},
hw(a,b,c){var t,s=b.d
if(s==null)s=b.d=new Map()
t=s.get(c)
if(t==null){t=A.o(a,b,null,c,null)
s.set(c,t)}return t},
o(a,b,c,d,e){var t,s,r,q,p,o,n,m,l,k,j
if(b===d)return!0
if(A.ai(d))return!0
t=b.w
if(t===4)return!0
if(A.ai(b))return!1
if(b.w===1)return!0
s=t===13
if(s)if(A.o(a,c[b.x],c,d,e))return!0
r=d.w
q=u.a
if(b===q||b===u.T){if(r===7)return A.o(a,b,c,d.x,e)
return d===q||d===u.T||r===6}if(d===u.K){if(t===7)return A.o(a,b.x,c,d,e)
return t!==6}if(t===7){if(!A.o(a,b.x,c,d,e))return!1
return A.o(a,A.cN(a,b),c,d,e)}if(t===6)return A.o(a,q,c,d,e)&&A.o(a,b.x,c,d,e)
if(r===7){if(A.o(a,b,c,d.x,e))return!0
return A.o(a,b,c,A.cN(a,d),e)}if(r===6)return A.o(a,b,c,q,e)||A.o(a,b,c,d.x,e)
if(s)return!1
q=t!==11
if((!q||t===12)&&d===u.Z)return!0
p=t===10
if(p&&d===u.U)return!0
if(r===12){if(b===u.L)return!0
if(t!==12)return!1
o=b.y
n=d.y
m=o.length
if(m!==n.length)return!1
c=c==null?o:o.concat(c)
e=e==null?n:n.concat(e)
for(l=0;l<m;++l){k=o[l]
j=n[l]
if(!A.o(a,k,c,j,e)||!A.o(a,j,e,k,c))return!1}return A.dI(a,b.x,c,d.x,e)}if(r===11){if(b===u.L)return!0
if(q)return!1
return A.dI(a,b,c,d,e)}if(t===8){if(r!==8)return!1
return A.fD(a,b,c,d,e)}if(p&&r===10)return A.fI(a,b,c,d,e)
return!1},
dI(a2,a3,a4,a5,a6){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1
if(!A.o(a2,a3.x,a4,a5.x,a6))return!1
t=a3.y
s=a5.y
r=t.a
q=s.a
p=r.length
o=q.length
if(p>o)return!1
n=o-p
m=t.b
l=s.b
k=m.length
j=l.length
if(p+k<o+j)return!1
for(i=0;i<p;++i){h=r[i]
if(!A.o(a2,q[i],a6,h,a4))return!1}for(i=0;i<n;++i){h=m[i]
if(!A.o(a2,q[p+i],a6,h,a4))return!1}for(i=0;i<j;++i){h=m[n+i]
if(!A.o(a2,l[i],a6,h,a4))return!1}g=t.c
f=s.c
e=g.length
d=f.length
for(c=0,b=0;b<d;b+=3){a=f[b]
for(;;){if(c>=e)return!1
a0=g[c]
c+=3
if(a<a0)return!1
a1=g[c-2]
if(a0<a){if(a1)return!1
continue}h=f[b+1]
if(a1&&!h)return!1
h=g[c-1]
if(!A.o(a2,f[b+2],a6,h,a4))return!1
break}}while(c<e){if(g[c+1])return!1
c+=3}return!0},
fD(a,b,c,d,e){var t,s,r,q,p,o=b.x,n=d.x
while(o!==n){t=a.tR[o]
if(t==null)return!1
if(typeof t=="string"){o=t
continue}s=t[n]
if(s==null)return!1
r=s.length
q=r>0?new Array(r):v.typeUniverse.sEA
for(p=0;p<r;++p)q[p]=A.cv(a,b,s[p])
return A.dD(a,q,null,c,d.y,e)}return A.dD(a,b.y,null,c,d.y,e)},
dD(a,b,c,d,e,f){var t,s=b.length
for(t=0;t<s;++t)if(!A.o(a,b[t],d,e[t],f))return!1
return!0},
fI(a,b,c,d,e){var t,s=b.y,r=d.y,q=s.length
if(q!==r.length)return!1
if(b.x!==d.x)return!1
for(t=0;t<q;++t)if(!A.o(a,s[t],c,r[t],e))return!1
return!0},
ax(a){var t=a.w,s=!0
if(!(a===u.a||a===u.T))if(!A.ai(a))if(t!==6)s=t===7&&A.ax(a.x)
return s},
ai(a){var t=a.w
return t===2||t===3||t===4||t===5||a===u.X},
dC(a,b){var t,s,r=Object.keys(b),q=r.length
for(t=0;t<q;++t){s=r[t]
a[s]=b[s]}},
cw(a){return a>0?new Array(a):v.typeUniverse.sEA},
F:function F(a,b){var _=this
_.a=a
_.b=b
_.r=_.f=_.d=_.c=null
_.w=0
_.as=_.Q=_.z=_.y=_.x=null},
bz:function bz(){this.c=this.b=this.a=null},
ct:function ct(a){this.a=a},
by:function by(){},
aU:function aU(a){this.a=a},
eF(a,b){return new A.L(a.i("@<0>").N(b).i("L<1,2>"))},
n(a,b,c){return A.hn(a,new A.L(b.i("@<0>").N(c).i("L<1,2>")))},
a7(a,b){return new A.L(a.i("@<0>").N(b).i("L<1,2>"))},
eG(a){return new A.ac(a.i("ac<0>"))},
eH(a){return new A.ac(a.i("ac<0>"))},
cP(){var t=Object.create(null)
t["<non-identifier-key>"]=t
delete t["<non-identifier-key>"]
return t},
cK(a,b,c){var t=A.eF(b,c)
a.I(0,new A.ca(t,b,c))
return t},
de(a){var t,s
if(A.cW(a))return"{...}"
t=new A.aN("")
try{s={}
$.af.push(a)
t.a+="{"
s.a=!0
a.I(0,new A.cb(s,t))
t.a+="}"}finally{$.af.pop()}s=t.a
return s.charCodeAt(0)==0?s:s},
ac:function ac(a){var _=this
_.a=0
_.f=_.e=_.d=_.c=_.b=null
_.r=0
_.$ti=a},
cr:function cr(a){this.a=a
this.b=null},
av:function av(a,b,c){var _=this
_.a=a
_.b=b
_.d=_.c=null
_.$ti=c},
ca:function ca(a,b,c){this.a=a
this.b=b
this.c=c},
C:function C(){},
cb:function cb(a,b){this.a=a
this.b=b},
at:function at(){},
aT:function aT(){},
fO(a,b){var t,s,r,q=null
try{q=JSON.parse(a)}catch(s){t=A.cY(s)
r=A.b9(String(t),null)
throw A.b(r)}r=A.cx(q)
return r},
cx(a){var t
if(a==null)return null
if(typeof a!="object")return a
if(!Array.isArray(a))return new A.bA(a,Object.create(null))
for(t=0;t<a.length;++t)a[t]=A.cx(a[t])
return a},
dd(a,b,c){return new A.aG(a,b)},
fq(a){return a.aL()},
eW(a,b){return new A.co(a,[],A.hi())},
eX(a,b,c){var t,s=new A.aN(""),r=A.eW(s,b)
r.U(a)
t=s.a
return t.charCodeAt(0)==0?t:t},
bA:function bA(a,b){this.a=a
this.b=b
this.c=null},
bB:function bB(a){this.a=a},
b2:function b2(){},
b4:function b4(){},
aG:function aG(a,b){this.a=a
this.b=b},
bh:function bh(a,b){this.a=a
this.b=b},
c6:function c6(){},
c8:function c8(a){this.b=a},
c7:function c7(a){this.a=a},
cp:function cp(){},
cq:function cq(a,b){this.a=a
this.b=b},
co:function co(a,b,c){this.c=a
this.a=b
this.b=c},
bG(a){var t=A.eP(a,null)
if(t!=null)return t
throw A.b(A.b9(a,null))},
eI(a,b,c,d){var t,s=c?J.ex(a,d):J.ew(a,d)
if(a!==0&&b!=null)for(t=0;t<s.length;++t)s[t]=b
return s},
eJ(a,b,c){var t,s,r=A.d([],c.i("e<0>"))
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s)r.push(a[s])
r.$flags=1
return r},
B(a,b){var t,s
if(Array.isArray(a))return A.d(a.slice(0),b.i("e<0>"))
t=A.d([],b.i("e<0>"))
for(s=J.d_(a);s.l();)t.push(s.gn())
return t},
G(a,b){var t=A.eJ(a,!1,b)
t.$flags=3
return t},
eS(a){return new A.bW(a,A.eC(a,!1,!0,!1,!1,""))},
dp(a,b,c){var t=J.d_(b)
if(!t.l())return a
if(c.length===0){do a+=A.m(t.gn())
while(t.l())}else{a+=A.m(t.gn())
while(t.l())a=a+c+A.m(t.gn())}return a},
er(a,b,c,d,e,f,g,h,i){var t=A.dk(a,b,c,d,e,f,g,h,i)
if(t==null)return null
return new A.A(A.d6(t,h,i),h,i)},
aA(a,b,c){var t=A.dk(a,b,c,0,0,0,0,0,!1)
return new A.A(t==null?new A.bS(a,b,c,0,0,0,0,0).$0():t,0,!1)},
et(a){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d=$.e_().aA(a)
if(d!=null){t=new A.bU()
s=d.b
r=s[1]
r.toString
q=A.bG(r)
r=s[2]
r.toString
p=A.bG(r)
r=s[3]
r.toString
o=A.bG(r)
n=t.$1(s[4])
m=t.$1(s[5])
l=t.$1(s[6])
k=new A.bV().$1(s[7])
j=B.a.v(k,1000)
i=s[8]!=null
if(i){h=s[9]
if(h!=null){g=h==="-"?-1:1
r=s[10]
r.toString
f=A.bG(r)
m-=g*(t.$1(s[11])+60*f)}}e=A.er(q,p,o,n,m,l,j,k%1000,i)
if(e==null)throw A.b(A.b9("Time out of range",a))
return e}else throw A.b(A.b9("Invalid date format",a))},
al(a){var t,s
try{t=A.et(a)
return t}catch(s){if(A.cY(s) instanceof A.b8)return null
else throw s}},
d6(a,b,c){var t="microsecond"
if(b<0||b>999)throw A.b(A.aK(b,0,999,t,null))
if(a<-864e13||a>864e13)throw A.b(A.aK(a,-864e13,864e13,"millisecondsSinceEpoch",null))
if(a===864e13&&b!==0)throw A.b(A.eg(b,t,"Time including microseconds is outside valid range"))
return a},
d5(a){var t=Math.abs(a),s=a<0?"-":""
if(t>=1000)return""+a
if(t>=100)return s+"0"+t
if(t>=10)return s+"00"+t
return s+"000"+t},
es(a){var t=Math.abs(a),s=a<0?"-":"+"
if(t>=1e5)return s+t
return s+"0"+t},
bT(a){if(a>=100)return""+a
if(a>=10)return"0"+a
return"00"+a},
J(a){if(a>=10)return""+a
return"0"+a},
eu(a,b,c){return new A.b5(b+1000*c+864e8*a)},
b6(a){if(typeof a=="number"||A.cT(a)||a==null)return J.b_(a)
if(typeof a=="string")return JSON.stringify(a)
return A.eQ(a)},
b1(a){return new A.b0(a)},
bI(a){return new A.V(!1,null,null,a)},
eg(a,b,c){return new A.V(!0,a,b,c)},
aK(a,b,c,d,e){return new A.bq(b,c,!0,a,d,"Invalid value")},
eR(a,b,c){if(0>a||a>c)throw A.b(A.aK(a,0,c,"start",null))
if(a>b||b>c)throw A.b(A.aK(b,a,c,"end",null))
return b},
dl(a,b){return a},
d8(a,b,c,d){return new A.ba(b,!0,a,d,"Index out of range")},
bx(a){return new A.aR(a)},
W(a){return new A.b3(a)},
b9(a,b){return new A.b8(a,b)},
ev(a,b,c){var t,s
if(A.cW(a)){if(b==="("&&c===")")return"(...)"
return b+"..."+c}t=A.d([],u.s)
$.af.push(a)
try{A.fN(a,t)}finally{$.af.pop()}s=A.dp(b,t,", ")+c
return s.charCodeAt(0)==0?s:s},
d9(a,b,c){var t,s
if(A.cW(a))return b+"..."+c
t=new A.aN(b)
$.af.push(a)
try{s=t
s.a=A.dp(s.a,a,", ")}finally{$.af.pop()}t.a+=c
s=t.a
return s.charCodeAt(0)==0?s:s},
fN(a,b){var t,s,r,q,p,o,n,m=a.gt(a),l=0,k=0
for(;;){if(!(l<80||k<3))break
if(!m.l())return
t=A.m(m.gn())
b.push(t)
l+=t.length+2;++k}if(!m.l()){if(k<=5)return
s=b.pop()
r=b.pop()}else{q=m.gn();++k
if(!m.l()){if(k<=4){b.push(A.m(q))
return}s=A.m(q)
r=b.pop()
l+=s.length+2}else{p=m.gn();++k
for(;m.l();q=p,p=o){o=m.gn();++k
if(k>100){for(;;){if(!(l>75&&k>3))break
l-=b.pop().length+2;--k}b.push("...")
return}}r=A.m(q)
s=A.m(p)
l+=s.length+r.length+4}}if(k>b.length+2){l+=5
n="..."}else n=null
for(;;){if(!(l>80&&b.length>3))break
l-=b.pop().length+2
if(n==null){l+=5
n="..."}}if(n!=null)b.push(n)
b.push(r)
b.push(s)},
eL(a,b){var t=B.a.gp(a)
b=B.a.gp(b)
b=A.eU(A.dq(A.dq($.ea(),t),b))
return b},
bS:function bS(a,b,c,d,e,f,g,h){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h},
A:function A(a,b,c){this.a=a
this.b=b
this.c=c},
bU:function bU(){},
bV:function bV(){},
b5:function b5(a){this.a=a},
cm:function cm(){},
h:function h(){},
b0:function b0(a){this.a=a},
aQ:function aQ(){},
V:function V(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bq:function bq(a,b,c,d,e,f){var _=this
_.e=a
_.f=b
_.a=c
_.b=d
_.c=e
_.d=f},
ba:function ba(a,b,c,d,e){var _=this
_.f=a
_.a=b
_.b=c
_.c=d
_.d=e},
aR:function aR(a){this.a=a},
bs:function bs(a){this.a=a},
b3:function b3(a){this.a=a},
bm:function bm(){},
aM:function aM(){},
cn:function cn(a){this.a=a},
b8:function b8(a,b){this.a=a
this.b=b},
l:function l(){},
O:function O(a,b,c){this.a=a
this.b=b
this.$ti=c},
aH:function aH(){},
c:function c(){},
aN:function aN(a){this.a=a},
hm(a,b,c,d){var t,s
if(c==="pro"){if(b==null||b.ad(a))return B.B
return B.i}if(c==="trial"&&d!=null){t=d.V(12096e8)
if(t.ad(a)){s=B.d.a8(B.a.v(t.a9(a).a,1e6)/86400)
return new A.am(B.o,s<0?0:s)}return B.C}return B.i},
aJ:function aJ(a,b){this.a=a
this.b=b},
a5:function a5(a,b){this.a=a
this.b=b},
am:function am(a,b){this.a=a
this.b=b},
ep(a2,a3,a4,a5,a6){var t,s,r,q,p,o,n,m,l,k,j,i,h,g=864e8,f=A.aA(A.H(a5),A.Q(a5),A.as(a5)),e=u.Y,d=A.d([],e),c=A.d([],e),b=A.d([],e),a=A.d([],e),a0=A.d([],e),a1=A.d([],e)
for(e=a2.length,t=f.a,s=f.b,r=0;r<a2.length;a2.length===e||(0,A.r)(a2),++r){q=a2[r]
p=A.bv(q,a3,a4)
o=q.b
n=A.aA(A.H(o),A.Q(o),A.as(o))
m=B.a.v(s-n.b+1000*(t-n.a),g)
l=m<0?0:m
k=A.eq(q)
n=A.aA(A.H(k),A.Q(k),A.as(k))
m=B.a.v(s-n.b+1000*(t-n.a),g)
j=m<0?0:m
i=new A.E(q,p,l,j)
switch(q.z.a){case 0:b.push(i)
if(p.w)d.push(i)
break
case 3:break
case 1:c.push(i)
if(p.w)d.push(i)
if(j>=7)a.push(i)
if(l>a6)a0.push(i)
break
case 2:h=q.x
if(h==null||q.w==null){c.push(i)
if(p.w)d.push(i)
if(j>=7)a.push(i)
if(l>a6)a0.push(i)
break}n=A.aA(A.H(h),A.Q(h),A.as(h))
m=B.a.v(s-n.b+1000*(t-n.a),g)
if((m<0?0:m)<=7){a1.push(i)
o=q.y
if(!(B.e.P(o==null?"":o).length!==0||q.ay.length!==0))a.push(i)}break}}B.c.A(d,new A.bM())
B.c.A(c,new A.bN())
B.c.A(b,new A.bO())
B.c.A(a,new A.bP())
B.c.A(a0,new A.bQ())
B.c.A(a1,new A.bR())
e=u.G
return new A.bL(A.G(d,e),A.G(c,e),A.G(b,e),A.G(a,e),A.G(a0,e),A.G(a1,e))},
eq(a){var t,s,r,q,p,o,n=a.b
for(t=a.ay,s=t.length,r=0;r<s;++r){q=t[r].a
p=q.a
o=n.a
if(p<=o)p=p===o&&q.b>n.b
else p=!0
if(p)n=q}return n},
E:function E(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bL:function bL(a,b,c,d,e,f){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f},
bM:function bM(){},
bN:function bN(){},
bO:function bO(){},
bP:function bP(){},
bQ:function bQ(){},
bR:function bR(){},
ho(a){var t,s,r,q,p,o,n,m,l,k,j,i=null
for(t=a.length,s=0,r=0,q=0;q<t;++q){p=a[q]
if(p==null||isNaN(p)||p==1/0||p==-1/0)continue
s+=p;++r}if(r===0)return i
o=t===0?i:B.c.gH(a)
t=!0
if(o!=null)if(!isNaN(o))t=o==1/0||o==-1/0||o===0
if(t)return new A.b7(0,i,s,r)
n=o>0
t=A.t(a).i("aO<1>")
m=new A.aO(a,1,i,t)
A.dl(1,"start")
m=new A.ar(m,m.gm(0),t.i("ar<j.E>"))
t=t.i("j.E")
l=1
while(m.l()){k=m.d
if(k==null)k=t.a(k)
j=!0
if(k!=null)if(!isNaN(k))j=k==1/0||k==-1/0||k===0
if(j)break
if(k>0!==n)break;++l}return new A.b7(l,n,s,r)},
b7:function b7(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
hf(a,b,c,d,e,f){var t,s,r,q,p,o,n=B.d.af(A.fp(f)*12),m=B.d.av(a==null||!isFinite(a)?0:a,0,100),l=m===0?0:Math.pow(1+m/100,0.08333333333333333)-1,k=b==null||!isFinite(b)?0:b,j=Math.max(0,k),i=Math.pow(1+l,n),h=j*i
if(c===B.k){k=d==null||!isFinite(d)?0:d
t=Math.max(0,k)
s=h+(l===0?t*n:t*((i-1)/l))
r=j+t*n
return new A.aC(c,t,s,r,Math.max(0,s-r),n,l,!1)}k=e==null||!isFinite(e)?0:e
q=Math.max(0,k)
if(h>=q)return new A.aC(c,0,h,j,Math.max(0,h-j),n,l,q>0)
p=q-h
o=l===0?p/n:p*l/(i-1)
r=j+o*n
return new A.aC(c,o,q,r,Math.max(0,q-r),n,l,!1)},
fZ(a){var t
if(!isFinite(a)||a<=0)return null
t=(Math.pow(1+a,12)-1)*100
if(!isFinite(t)||t<=0)return null
return t>100?100:t},
fp(a){var t=a==null||!isFinite(a)?0:a
if(t<1)return 1
if(t>50)return 50
return t},
K:function K(a,b){this.a=a
this.b=b},
aC:function aC(a,b,c,d,e,f,g,h){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h},
dX(a){var t,s,r,q,p,o,n,m
if(a.length===0)return null
t=B.c.gH(a)
s=B.c.gH(a)
for(r=a.length,q=0;q<r;++q){p=a[q]
o=p.a
n=t.a
if(o>=n)n=o===n&&p.b<t.b
else n=!0
if(n)t=p
n=s.a
if(o<=n)o=o===n&&p.b>s.b
else o=!0
if(o)s=p}m=B.a.v(s.a9(t).a,1000)/864e5/30.44
return r/(m<1?1:m)},
hy(a,b,c,d){var t,s,r,q,p,o,n,m,l,k=null,j=A.d([],u.g)
for(t=d.length,s=0;s<d.length;d.length===t||(0,A.r)(d),++s){r=d[s]
if(r.z===B.h&&r.x!=null){q=r.x
q.toString
j.push(q)}}if(!isFinite(a)||a<=0)return B.I
if(c<=a)return B.H
t=j.length
if(t<10)return new A.X(B.q,0,!1,k,k,k,k,t)
p=A.dX(j)
if(b==null||p==null)return new A.X(B.q,0,!1,k,k,k,k,j.length)
o=b*p
if(o<=0)return new A.X(B.Y,0,!1,b,p,o,k,j.length)
n=o/a
m=Math.log(c/a)/Math.log(1+n)
l=B.d.a8(m)
t=l>600?600:l
return new A.X(B.W,t,m>600,b,p,o,n,j.length)},
aa:function aa(a,b){this.a=a
this.b=b},
X:function X(a,b,c,d,e,f,g,h){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h},
db(f9,g0,g1){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,d0,d1,d2,d3,d4,d5,d6,d7,d8,d9,e0,e1,e2,e3,e4,e5,e6,e7,e8,e9,f0,f1,f2,f3,f4,f5=null,f6=u.J,f7=A.d([],f6),f8=A.d([],f6)
for(f6=f9.length,t=0;t<f9.length;f9.length===f6||(0,A.r)(f9),++t){s=f9[t]
r=s.z
if(!(r===B.f||r===B.h))continue
f7.push(s)
if(s.w!=null&&s.x!=null)f8.push(s)}if(f7.length===0)return B.L
B.c.A(f8,new A.bY())
f6=u.N
r=u.S
q=A.a7(f6,r)
for(p=f7.length,o=0,n=0,m=0,t=0;t<f7.length;f7.length===p||(0,A.r)(f7),++t){s=f7[t]
l=A.bv(s,g0,g1)
o+=l.a
k=l.c
if(k!=null){n+=k;++m}j=B.e.P(s.c)
if(j.length!==0){i=q.h(0,j)
q.B(0,j,(i==null?0:i)+1)}}h=A.d([],u.n)
p=u.i
g=A.a7(r,p)
f=A.a7(r,p)
p=u.k
r=u.W
e=A.a7(p,r)
d=A.a7(p,r)
r=u.V
c=A.a7(f6,r)
b=A.a7(f6,r)
for(f6=f8.length,a=f5,a0=a,a1=0,a2=0,a3=0,a4=0,a5=0,a6=0,a7=0,a8=0,a9=0,b0=0,b1=0,b2=0,b3=0,t=0;r=f8.length,t<r;f8.length===f6||(0,A.r)(f8),++t){s=f8[t]
l=A.bv(s,g0,g1)
b4=l.d
if(b4==null)continue
b5=s.x
a9+=b4
r=s.b
p=b5.a
b6=B.a.v(b5.b-r.b+1000*(p-r.a),864e8)
b7=0
if(b6>=0){a1+=b6;++a2}if(b4>0){a3+=b4
a5+=b4;++a6;++b0
b1=b7}else{if(b4<0){a4+=b4
a7+=b4;++a8;++b1}else b1=b7
b0=0}if(b0>b2)b2=b0
if(b1>b3)b3=b1
if(a0==null||b4>a0.c)a0=new A.bu(s.a,s.c,b4,b5)
if(a==null||b4<a.c)a=new A.bu(s.a,s.c,b4,b5)
b8=l.f
if(b8!=null)h.push(b8)
r=g.h(0,A.cL(b5))
if(r==null)r=0
g.B(0,A.cL(b5),r+b4)
r=f.h(0,A.Q(b5))
if(r==null)r=0
f.B(0,A.Q(b5),r+b4)
b9=A.aA(A.H(b5),A.Q(b5),1)
r=e.h(0,b9)
if(r==null){r=new A.aS()
e.B(0,b9,r)}r.a+=b4;++r.b
c0=A.aA(A.H(b5),A.Q(b5),A.as(b5))
c1=c0.V(0-864e8*B.a.L(A.cL(c0)+1,7))
r=d.h(0,c1)
if(r==null){r=new A.aS()
d.B(0,c1,r)}r.a+=b4;++r.b
for(r=s.Q,r=new A.i(r,new A.bZ(),A.t(r).i("i<1,a>")).aG(0),p=A.x(r),i=new A.av(r,r.r,p.i("av<1>")),i.c=r.e,p=p.c;i.l();){r=i.d
if(r==null)r=p.a(r)
if(r.length===0)continue
c2=c.h(0,r)
if(c2==null){c2=new A.T()
c.B(0,r,c2)
r=c2}else r=c2
r.O(0,b4)}r=s.ch
c3=r==null?f5:B.e.P(r)
if(c3!=null&&c3.length!==0){r=b.h(0,c3)
if(r==null){r=new A.T()
b.B(0,c3,r)}r.O(0,b4)}}for(f6=new A.M(q,q.$ti.i("M<1,2>")).gt(0),c4=f5,c5=0;f6.l();){c6=f6.d
c7=c6.b
if(c7<=c5){p=!1
if(c7===c5)if(c4!=null){p=c6.a
if(p===c4)p=0
else p=p<c4?-1:1
p=p<0}}else p=!0
if(p){c4=c6.a
c5=c7}}c8=A.c3(g,!0)
c9=A.c3(g,!1)
d0=A.c3(f,!0)
d1=A.c3(f,!1)
f6=new A.c0()
d2=f6.$1(c)
d3=f6.$1(b)
f6=a2===0?f5:a1/a2
p=A.U(o,f7.length)
i=m===0?f5:n/m
c2=A.dc(e)
d4=A.dc(d)
d5=c8==null
d6=d5?f5:c8.a
d5=d5?f5:c8.b
d7=c9==null
d8=d7?f5:c9.a
d7=d7?f5:c9.b
d9=d0==null
e0=d9?f5:d0.a
d9=d9?f5:d0.b
e1=d1==null
e2=e1?f5:d1.a
e1=e1?f5:d1.b
e3=a6===0?f5:a5/a6
e4=a8===0?f5:a7/a8
e5=(a0==null?f5:a0.c)!=null&&a0.c>0?a0.c:f5
e6=(a==null?f5:a.c)!=null&&a.c<0?a.c:f5
e7=h.length===0?f5:B.c.aF(h,new A.c_())/h.length
e8=A.eD(h)
r=r===0?f5:a9/r
e9=a4===0?f5:a3/Math.abs(a4)
f0=u.M
f1=A.G(d2,f0)
f2=d2.length===0?f5:B.c.gH(d2)
f3=d2.length===0?f5:B.c.gae(d2)
f0=A.G(d3,f0)
f4=d3.length===0?f5:B.c.gH(d3)
return new A.bf(f6,b2,b3,a0,a,c4,c5,p,i,c2,d4,d6,d5,d8,d7,e0,d9,e2,e1,e3,e4,e5,e6,e7,e8,r,e9,f1,f2,f3,f0,f4,d3.length===0?f5:B.c.gae(d3))},
dc(a){var t,s,r,q=A.x(a).i("N<1>"),p=A.B(new A.N(a,q),q.i("l.E"))
B.c.a3(p)
q=[]
for(t=p.length,s=0;s<p.length;p.length===t||(0,A.r)(p),++s){r=p[s]
q.push(new A.a9(r,a.h(0,r).a,a.h(0,r).b))}return A.G(q,u._)},
c3(a,b){var t,s,r,q,p,o
for(t=new A.M(a,A.x(a).i("M<1,2>")).gt(0),s=null;t.l();){r=t.d
r.toString
q=!0
if(s!=null){p=r.b
o=s.b
if(!(b?p>o:p<o))q=p===o&&r.a<s.a}if(q)s=r}return s},
eD(a){var t,s,r
if(a.length===0)return null
t=A.B(a,u.i)
B.c.a3(t)
s=t.length
r=s/2|0
if((s&1)===1)return t[r]
return(t[r-1]+t[r])/2},
a9:function a9(a,b,c){this.a=a
this.b=b
this.c=c},
v:function v(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bu:function bu(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bf:function bf(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i
_.y=j
_.z=k
_.Q=l
_.as=m
_.at=n
_.ax=o
_.ay=p
_.ch=q
_.CW=r
_.cx=s
_.cy=t
_.db=a0
_.dx=a1
_.dy=a2
_.fr=a3
_.fx=a4
_.fy=a5
_.go=a6
_.id=a7
_.k1=a8
_.k2=a9
_.k3=b0
_.k4=b1
_.ok=b2},
bY:function bY(){},
bZ:function bZ(){},
c0:function c0(){},
c1:function c1(){},
c2:function c2(){},
c_:function c_(){},
aS:function aS(){this.b=this.a=0},
T:function T(){this.c=this.b=this.a=0},
eE(a8,a9,b0){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6=null,a7=A.d([],u.J)
for(t=a8.length,s=0,r=0,q=0,p=0,o=0,n=0,m=0;m<a8.length;a8.length===t||(0,A.r)(a8),++m){l=a8[m]
if(l.as)++p
k=l.ax
if(k.length!==0){o+=A.cz(k);++n}switch(l.z.a){case 0:++r
break
case 3:++q
break
case 1:++s
break
case 2:if(l.w==null||l.x==null)++s
else a7.push(l)
break}}B.c.A(a7,new A.c5())
j=A.d([],u.t)
if(a7.length!==0){t=B.c.gH(a7).x
t.toString
j.push(new A.an(t,a9))}for(t=a7.length,i=0,h=0,g=0,f=0,e=0,d=0,c=0,b=0,m=0;k=a7.length,m<k;a7.length===t||(0,A.r)(a7),++m){l=a7[m]
a=A.bv(l,a9,b0)
a0=a.d
if(a0==null)a0=0
i+=a0
switch(a.x.a){case 1:++h
e+=a0
break
case 2:++g
d+=a0
break
case 3:++f
break
case 0:break}a1=a.f
if(a1!=null){c+=a1;++b}k=l.x
k.toString
j.push(new A.an(k,a9+i))}t=n===0?a6:o/n
a2=k===0?a6:h/k
a3=b===0?a6:c/b
a4=h===0?a6:e/h
a5=g===0?a6:d/g
return new A.c4(k,h,g,f,s,r,q,p,t,a2,i,a3,a4,a5,a9+i,A.U(i,a9),A.G(j,u.I))},
an:function an(a,b){this.a=a
this.b=b},
c4:function c4(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i
_.y=j
_.z=k
_.Q=l
_.as=m
_.at=n
_.ax=o
_.ay=p
_.ch=q},
c5:function c5(){},
eM(a,b,c){var t,s,r,q,p,o,n,m,l,k,j,i,h,g=A.d([],u.J)
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s){r=a[s]
if(r.z===B.f&&r.r>0)g.push(r)}if(g.length===0)return B.V
t=u.n
q=A.d([],t)
p=A.d([],t)
for(t=g.length,o=0,n=0,s=0;s<g.length;g.length===t||(0,A.r)(g),++s){r=g[s]
m=A.eO(r,c)
if(m==null)l=0
else{k=(m-r.e)*r.r
l=isFinite(k)?k:0}j=A.eN(r,b)
if(j==null)i=0
else{k=(j-r.e)*r.r
i=isFinite(k)?k:0}q.push(l)
p.push(i)
o+=l
n+=i}t=A.d([],u.o)
for(h=0;h<g.length;++h){k=g[h]
t.push(new A.P(k.a,k.c,q[h]+(n-p[h])))}B.c.A(t,new A.ce())
return new A.bn(g.length,o,n,A.G(t,u.R))},
eO(a,b){var t=a.CW
if(t!=null&&isFinite(t)&&t>a.e)return t
if(!isFinite(b)||b<=0)return null
return A.ay(a.e*(1+b))},
eN(a,b){var t,s=a.f
if(isFinite(s)&&s>0&&s<a.e)return s
if(!isFinite(b)||b<=0)return null
t=A.ay(a.e*(1-b))
if(t==null||t<=0)return null
return t},
P:function P(a,b,c){this.a=a
this.b=b
this.c=c},
bn:function bn(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
ce:function ce(){},
cM:function cM(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
dn(a,b,a0,a1,a2,a3){var t,s,r,q,p,o,n,m=null,l=A.dT(b,a1),k=a0!=null&&isFinite(a0)&&a0>0?a0:m,j=a2!=null&&isFinite(a2)&&a2>0?a2:m,i=k!=null,h=i&&j!=null&&k>j?k-j:m,g=i&&j!=null?A.dW(k,l,j):m,f=a!=null&&isFinite(a)&&a>0?a:m,e=f!=null&&i?B.d.aa(f/k):m,d=g==null,c=!d
if(c&&e!=null)t=e<g?e:g
else t=d?e:g
s=c&&e!=null&&e<g
r=a3!=null&&a3>0?a3:t
q=m
p=m
if(i&&r!=null&&r>0){o=k*r
if(!isFinite(o))o=m
if(h!=null){n=h*r
if(!!isFinite(n)){p=A.U(n,b)
q=n}}}else o=m
i=p!=null&&A.cA(p,a1)
return new A.cg(l,h,t,r,o,q,p,i,g===0,s,f)},
cg:function cg(a,b,c,d,e,f,g,h,i,j,k){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i
_.y=j
_.z=k},
aP:function aP(a,b){this.a=a
this.b=b},
cO:function cO(a,b,c,d,e,f,g,h,i,j,k,l){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i
_.y=j
_.z=k
_.Q=l},
bv(a,b,c){var t,s,r,q,p,o,n,m,l,k=null,j=a.r,i=a.e,h=i*j
if(!isFinite(h))h=0
t=(i-a.f)*j
if(!isFinite(t))t=0
s=A.U(t,b)
r=a.w
q=r==null
if(!q){p=(r-i)*j
o=isFinite(p)?p:k}else o=k
if(q)n=B.r
else if(o==null)n=B.r
else if(o>0)n=B.a2
else n=o<0?B.a3:B.a4
m=o==null
l=m?k:A.U(o,h)
m=m?k:A.U(o,t)
return new A.cj(h,t,s,o,l,m,q,s!=null&&A.cA(s,c),n)},
au:function au(a,b){this.a=a
this.b=b},
cj:function cj(a,b,c,d,e,f,g,h,i){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i},
ej(a){var t,s
for(t=0;t<6;++t){s=B.l[t]
if(s.c===a)return s}return null},
cz(a){var t,s,r,q=A.eH(u.N)
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s){r=a[s]
if(A.ej(r)!=null)q.O(0,r)}return q.a/6},
I:function I(a,b,c,d){var _=this
_.c=a
_.d=b
_.a=c
_.b=d},
bt:function bt(a){this.a=a},
a_:function a_(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i
_.y=j
_.z=k
_.Q=l
_.as=m
_.ax=n
_.ay=o
_.ch=p
_.CW=q},
eV(a,b){var t,s
for(t=0;t<4;++t){s=B.O[t]
if(s.b===a)return s}return b},
ab:function ab(a,b){this.a=a
this.b=b},
cy(a){var t,s,r,q
if(u.j.b(a)){t=A.d([],u.s)
for(s=a.length,r=0;r<a.length;a.length===s||(0,A.r)(a),++r){q=a[r]
if(typeof q=="string")t.push(q)}}else t=B.R
return t},
cU(a3){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a=null,a0="exitPrice",a1="timeline",a2=A.a2(a3.h(0,"id"))
if(a2==null)a2=""
t=a3.h(0,"entryDate")
t=typeof t=="string"?A.al(t):a
if(t==null)t=new A.A(Date.now(),0,!1)
s=A.a2(a3.h(0,"ticker"))
if(s==null)s=""
r=A.a2(a3.h(0,"reason"))
if(r==null)r=""
q=a3.h(0,"entryPrice")
q=typeof q=="number"?q:a
if(q==null)q=0
p=a3.h(0,"stopPrice")
p=typeof p=="number"?p:a
if(p==null)p=0
o=A.bC(a3.h(0,"quantity"))
o=o==null?a:B.d.S(o)
if(o==null)o=0
n=a3.h(0,a0)
n=typeof n=="number"?n:a
m=a3.h(0,"exitDate")
m=typeof m=="string"?A.al(m):a
l=A.a2(a3.h(0,"notes"))
k=A.a2(a3.h(0,"status"))
k=A.eV(k,a3.h(0,a0)==null?B.f:B.h)
j=A.cy(a3.h(0,"tags"))
i=J.cG(a3.h(0,"isFavorite"),!0)
A.cy(a3.h(0,"screenshotPaths"))
h=A.cy(a3.h(0,"completedChecklistItems"))
g=A.d([],u.O)
f=u.j
if(f.b(a3.h(0,a1)))for(f=f.a(a3.h(0,a1)),e=f.length,d=0;d<f.length;f.length===e||(0,A.r)(f),++d){c=f[d]
if(c instanceof A.C){b=c.h(0,"date")
b=typeof b=="string"?A.al(b):a
if(b==null)b=new A.A(Date.now(),0,!1)
A.a2(c.h(0,"text"))
g.push(new A.bt(b))}}f=A.a2(a3.h(0,"source"))
e=a3.h(0,"takeProfitPrice")
return new A.a_(a2,t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,typeof e=="number"?e:a)},
bE(a){var t,s,r,q,p,o
if(u.j.b(a)){t=A.d([],u.J)
for(s=a.length,r=u.N,q=u.z,p=0;p<a.length;a.length===s||(0,A.r)(a),++p){o=a[p]
if(o instanceof A.C)t.push(A.cU(A.cK(o,r,q)))}}else t=B.S
return t},
fP(a){return A.n(["start",a.a.T(),"pnl",a.b,"tradeCount",a.c],u.N,u.X)},
bD(a){return a==null?null:A.n(["tag",a.a,"totalPnl",a.b,"tradeCount",a.c,"winCount",a.d],u.N,u.X)},
dG(a){return a==null?null:A.n(["tradeId",a.a,"ticker",a.b,"pnl",a.c,"exitDate",a.d.T()],u.N,u.X)},
dL(a){return A.n(["positionValue",a.a,"riskEgp",a.b,"riskPct",a.c,"pnl",a.d,"returnPct",a.e,"rMultiple",a.f,"isOpen",a.r,"overRisk",a.w,"result",a.x.b],u.N,u.X)},
fM(a){var t=a.a
return A.n(["tradeId",t.a,"ticker",t.c,"metrics",A.dL(a.b),"daysSinceEntry",a.c,"daysSinceUpdate",a.d],u.N,u.X)},
dN(a){return A.n(["maxLoss",a.a,"riskPerShare",a.b,"suggestedQty",a.c,"effectiveQty",a.d,"positionValue",a.e,"riskEgp",a.f,"riskPct",a.r,"overRisk",a.w,"capitalTooSmall",a.x,"limitedByBudget",a.y,"budget",a.z],u.N,u.X)},
fY(a){var t,s,r,q,p,o,n,m,l=null,k=u.P.a(B.b.u(a,l)),j=A.bE(k.h(0,"trades")),i=k.h(0,"capital")
i=typeof i=="number"?i:l
if(i==null)i=0
t=k.h(0,"maxRiskPercent")
t=typeof t=="number"?t:l
s=A.db(j,i,t==null?0:t)
j=A.dG(s.d)
i=A.dG(s.e)
t=s.y
r=A.t(t).i("i<1,f<a,c?>>")
t=A.B(new A.i(t,A.dO(),r),r.i("j.E"))
r=s.z
q=A.t(r).i("i<1,f<a,c?>>")
r=A.B(new A.i(r,A.dO(),q),q.i("j.E"))
q=s.id
p=A.t(q).i("i<1,f<a,c?>?>")
q=A.B(new A.i(q,A.dP(),p),p.i("j.E"))
p=A.bD(s.k1)
o=A.bD(s.k2)
n=s.k3
m=A.t(n).i("i<1,f<a,c?>?>")
n=A.B(new A.i(n,A.dP(),m),m.i("j.E"))
return B.b.q(A.n(["averageHoldingDays",s.a,"longestWinStreak",s.b,"longestLossStreak",s.c,"bestTrade",j,"worstTrade",i,"mostTradedTicker",s.f,"mostTradedTickerCount",s.r,"averagePositionValue",s.w,"averageRiskPct",s.x,"monthlyPnl",t,"weeklyPnl",r,"bestWeekday",s.Q,"bestWeekdayPnl",s.as,"worstWeekday",s.at,"worstWeekdayPnl",s.ax,"bestMonth",s.ay,"bestMonthPnl",s.ch,"worstMonth",s.CW,"worstMonthPnl",s.cx,"averageProfit",s.cy,"averageLoss",s.db,"largestGain",s.dx,"largestLoss",s.dy,"averageR",s.fr,"medianR",s.fx,"expectancy",s.fy,"profitFactor",s.go,"tagStats",q,"mostProfitableTag",p,"mostLosingTag",o,"sourceStats",n,"bestSource",A.bD(s.k4),"worstSource",A.bD(s.ok)],u.N,u.X),l)},
hG(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bE(m.h(0,"trades")),k=m.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=m.h(0,"maxRiskPercent")
t=typeof t=="number"?t:n
s=A.eE(l,k,t==null?0:t)
l=A.d([],u.x)
for(k=s.ch,t=k.length,r=u.N,q=u.K,p=0;p<t;++p){o=k[p]
l.push(A.n(["date",o.a.T(),"equity",o.b],r,q))}return B.b.q(A.n(["closedCount",s.a,"winCount",s.b,"lossCount",s.c,"breakevenCount",s.d,"openCount",s.e,"plannedCount",s.f,"cancelledCount",s.r,"favoriteCount",s.w,"averageChecklistCompletion",s.x,"winRate",s.y,"totalPnl",s.z,"averageR",s.Q,"avgWinEgp",s.as,"avgLossEgp",s.at,"currentCapital",s.ax,"totalReturnPct",s.ay,"equityCurve",l],r,u.X),n)},
hk(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bE(m.h(0,"trades")),k=m.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=m.h(0,"maxRiskPercent")
t=typeof t=="number"?t:n
if(t==null)t=0
s=m.h(0,"today")
s=typeof s=="string"?A.al(s):n
if(s==null)s=new A.A(Date.now(),0,!1)
r=A.bC(m.h(0,"waitingThresholdDays"))
r=r==null?n:B.d.S(r)
q=A.ep(l,k,t,s,r==null?7:r)
l=q.a
k=A.t(l).i("i<1,f<a,c?>>")
l=A.B(new A.i(l,A.aZ(),k),k.i("j.E"))
k=q.b
t=A.t(k).i("i<1,f<a,c?>>")
k=A.B(new A.i(k,A.aZ(),t),t.i("j.E"))
t=q.c
s=A.t(t).i("i<1,f<a,c?>>")
t=A.B(new A.i(t,A.aZ(),s),s.i("j.E"))
s=q.d
r=A.t(s).i("i<1,f<a,c?>>")
s=A.B(new A.i(s,A.aZ(),r),r.i("j.E"))
r=q.e
p=A.t(r).i("i<1,f<a,c?>>")
r=A.B(new A.i(r,A.aZ(),p),p.i("j.E"))
p=q.f
o=A.t(p).i("i<1,f<a,c?>>")
p=A.B(new A.i(p,A.aZ(),o),o.i("j.E"))
return B.b.q(A.n(["overRisk",l,"open",k,"planned",t,"needsReview",s,"waitingTooLong",r,"recentlyClosed",p],u.N,u.A),n)},
hD(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bE(m.h(0,"trades")),k=m.h(0,"defaultTakeProfitPercent")
k=typeof k=="number"?k:n
if(k==null)k=0.05
t=m.h(0,"defaultStopLossPercent")
t=typeof t=="number"?t:n
s=A.eM(l,t==null?0.02:t,k)
l=A.d([],u.x)
for(k=s.d,t=k.length,r=u.N,q=u.K,p=0;p<t;++p){o=k[p]
l.push(A.n(["tradeId",o.a,"ticker",o.b,"net",o.c],r,q))}return B.b.q(A.n(["openCount",s.a,"totalExpectedProfit",s.b,"totalExpectedLoss",s.c,"oneWinner",l],r,u.X),n)},
hC(a){var t,s,r,q,p=null,o=u.P.a(B.b.u(a,p)),n=u.N,m=A.cU(A.cK(u.f.a(o.h(0,"trade")),n,u.z)),l=o.h(0,"capital")
l=typeof l=="number"?l:p
if(l==null)l=0
t=o.h(0,"maxRiskPercent")
t=typeof t=="number"?t:p
if(t==null)t=0
s=m.e
r=m.f
q=A.U((s-r)*m.r,l)
l=A.cz(m.ax)
t=q!=null&&!A.cA(q,t)
s=r>0&&r<s
return B.b.q(A.n(["checklistComplete",l>=1,"riskWithinLimit",t,"hasStop",s,"hasDetailedReason",B.e.P(m.d).length>20],n,u.y),p)},
hK(a){var t,s=null,r=u.P.a(B.b.u(a,s)),q=A.cU(A.cK(u.f.a(r.h(0,"trade")),u.N,u.z)),p=r.h(0,"capital")
p=typeof p=="number"?p:s
if(p==null)p=0
t=r.h(0,"maxRiskPercent")
t=typeof t=="number"?t:s
return B.b.q(A.dL(A.bv(q,p,t==null?0:t)),s)},
hE(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=n.h(0,"capital")
m=typeof m=="number"?m:o
if(m==null)m=0
t=n.h(0,"maxRiskPercent")
t=typeof t=="number"?t:o
if(t==null)t=0
s=n.h(0,"entry")
s=typeof s=="number"?s:o
r=n.h(0,"stop")
r=typeof r=="number"?r:o
q=A.bC(n.h(0,"userQty"))
q=q==null?o:B.d.S(q)
p=n.h(0,"budget")
return B.b.q(A.dN(A.dn(typeof p=="number"?p:o,m,s,t,r,q)),o)},
hF(a7){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3=null,a4="takeProfitPercent",a5=u.P.a(B.b.u(a7,a3)),a6=a5.h(0,"capital")
a6=typeof a6=="number"?a6:a3
if(a6==null)a6=0
t=a5.h(0,"maxRiskPercent")
t=typeof t=="number"?t:a3
if(t==null)t=0
s=a5.h(0,a4)
s=typeof s=="number"?s:a3
if(s==null)s=0.05
r=a5.h(0,"stopLossPercent")
r=typeof r=="number"?r:a3
if(r==null)r=0.02
q=a5.h(0,"entryPrice")
p=typeof q=="number"?q:a3
q=A.bC(a5.h(0,"userQty"))
q=q==null?a3:B.d.S(q)
o=a5.h(0,"stopPrice")
o=typeof o=="number"?o:a3
n=a5.h(0,"targetPrice")
n=typeof n=="number"?n:a3
m=a5.h(0,"budget")
m=typeof m=="number"?m:a3
p=p!=null&&isFinite(p)&&p>0?p:a3
l=n!=null&&isFinite(n)&&n>0&&p!=null&&n>p?A.ay(n):a3
n=l==null
if(!n){p.toString
k=(l-p)/p}else k=isFinite(s)&&s>0?s:0
j=o!=null&&isFinite(o)&&o>0&&p!=null&&o<p?A.ay(o):a3
s=j==null
if(!s){p.toString
i=(p-j)/p}else i=isFinite(r)&&r>0&&r<1?r:0
r=p!=null
if(r){h=n&&k>0?A.ay(p*(1+k)):l
g=s&&i>0?A.ay(p*(1-i)):j}else{g=j
h=l}if(h!=null&&r&&h<=p)h=a3
if(g!=null&&r&&g>=p)g=a3
f=r&&h!=null?h-p:a3
e=r&&g!=null?p-g:a3
s=f!=null
d=s&&e!=null?A.U(f,e):a3
if(d==null)c=a3
else if(A.cX(d,2))c=B.a_
else c=A.cX(d,1)?B.a0:B.a1
b=A.dn(m,a6,p,t,g,q)
a=b.d
a0=a3
a1=a3
if(a!=null&&a>0){if(s){a2=f*a
a0=isFinite(a2)?a2:a3}if(e!=null){a2=-e*a
a1=isFinite(a2)?a2:a3}}a6=c==null?a3:c.b
return B.b.q(A.n(["entryPrice",p,a4,k,"stopLossPercent",i,"takeProfitPrice",h,"stopLossPrice",g,"rewardPerShare",f,"riskPerShare",e,"rewardRiskRatio",d,"quality",a6,"sizing",A.dN(b),"expectedProfit",a0,"expectedLoss",a1],u.N,u.X),a3)},
hu(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=B.c.aB(B.P,new A.cB(n),new A.cC()),l=n.h(0,"targetAmount")
l=typeof l=="number"?l:o
t=n.h(0,"monthlyDeposit")
t=typeof t=="number"?t:o
s=n.h(0,"years")
s=typeof s=="number"?s:o
r=n.h(0,"annualReturnPercent")
r=typeof r=="number"?r:o
q=n.h(0,"initialAmount")
p=A.hf(r,typeof q=="number"?q:o,m,t,l,s)
m=p.r
return B.b.q(A.n(["mode",p.a.b,"monthlyDeposit",p.b,"futureValue",p.c,"totalDeposited",p.d,"growth",p.e,"months",p.f,"monthlyRate",m,"coveredByInitial",p.w,"annualFromMonthly",A.fZ(m),"minYears",1,"maxYears",50,"maxAnnualReturn",100],u.N,u.X),o)},
hz(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=A.bE(n.h(0,"trades")),l=n.h(0,"capital")
l=typeof l=="number"?l:o
if(l==null)l=0
t=n.h(0,"targetAmount")
t=typeof t=="number"?t:o
if(t==null)t=0
s=n.h(0,"capital")
s=typeof s=="number"?s:o
if(s==null)s=0
r=n.h(0,"maxRiskPercent")
r=typeof r=="number"?r:o
q=A.hy(l,A.db(m,s,r==null?0:r).fy,t,m)
l=A.d([],u.g)
for(t=m.length,p=0;p<m.length;m.length===t||(0,A.r)(m),++p){s=m[p].x
if(s!=null)l.push(s)}return B.b.q(A.n(["kind",q.a.b,"months",q.b,"beyondHorizon",q.c,"expectancy",q.d,"tradesPerMonth",q.e,"monthlyProfit",q.f,"monthlyRate",q.r,"closedCount",q.w,"minClosedTrades",10,"maxMonths",600,"tradesPerMonthDirect",A.dX(l)],u.N,u.X),o)},
hl(a){var t,s,r,q,p,o,n,m,l=null,k=u.P.a(B.b.u(a,l)),j=k.h(0,"trialStartedAt"),i=typeof j=="string"?A.al(j):l
j=A.a2(k.h(0,"plan"))
t=k.h(0,"proUntil")
t=typeof t=="string"?A.al(t):l
s=k.h(0,"now")
s=typeof s=="string"?A.al(s):l
r=A.hm(s==null?new A.A(Date.now(),0,!1):s,t,j,i)
j=r.a
t=r.b
if(j===B.o)s=(t==null?99:t)<=5
else s=!1
q=u.N
p=A.a7(q,u.y)
for(o=0;o<4;++o){n=B.Q[o]
p.B(0,n.b,!0)}m=i==null?l:i.V(12096e8)
m=m==null?l:m.T()
return B.b.q(A.n(["plan",j.b,"trialDaysLeft",t,"shouldWarnAboutTrial",s,"features",p,"trialEndsAt",m,"trialDays",14,"everythingFree",!0],q,u.X),l)},
hB(a){var t,s,r,q,p,o,n=null,m="maxRiskPercent",l=u.P.a(B.b.u(a,n)),k=l.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=l.h(0,m)
t=typeof t=="number"?t:n
s=A.dT(k,t==null?0:t)
k=l.h(0,"entry")
k=typeof k=="number"?k:n
if(k==null)k=0
t=l.h(0,"stop")
t=typeof t=="number"?t:n
k=A.dW(k,s,t==null?0:t)
t=l.h(0,"price")
t=typeof t=="number"?t:n
t=A.ay(t==null?0:t)
r=l.h(0,"a")
r=typeof r=="number"?r:n
if(r==null)r=0
q=l.h(0,"b")
q=typeof q=="number"?q:n
r=A.U(r,q==null?1:q)
q=l.h(0,"ratio")
q=typeof q=="number"?q:n
p=l.h(0,"threshold")
p=typeof p=="number"?p:n
q=A.cX(q,p==null?0:p)
p=l.h(0,"riskPct")
p=typeof p=="number"?p:n
if(p==null)p=0
o=l.h(0,m)
o=typeof o=="number"?o:n
return B.b.q(A.n(["maxLoss",s,"suggestedQuantity",k,"roundToPiastre",t,"safeDiv",r,"meetsRatio",q,"exceedsRiskLimit",A.cA(p,o==null?0:o)],u.N,u.X),n)},
he(a){var t,s,r,q=A.cy(B.b.u(a,null)),p=A.cz(q),o=A.cz(q),n=A.d([],u.p)
for(t=u.N,s=0;s<6;++s){r=B.l[s]
n.push(A.n(["id",r.c,"label",r.d],t,t))}return B.b.q(A.n(["completion",p,"complete",o>=1,"items",n],t,u.K),null)},
hp(a){var t,s,r,q,p=null,o=B.b.u(a,p),n=A.d([],u.c)
if(u.j.b(o))for(t=o.length,s=0;s<o.length;o.length===t||(0,A.r)(o),++s){r=o[s]
n.push(typeof r=="number"?r:p)}q=A.ho(n)
if(q==null)return B.b.q(p,p)
n=q.a
return B.b.q(A.n(["runLength",n,"runBuying",q.b,"total",q.c,"sessions",q.d,"hasRun",n>=2],u.N,u.X),p)},
cB:function cB(a){this.a=a},
cC:function cC(){},
hx(){var t={},s=new A.cD(t)
s.$2("analytics",A.h0())
s.$2("stats",A.hc())
s.$2("decisions",A.h2())
s.$2("scenarios",A.h9())
s.$2("riskScore",A.h8())
s.$2("tradeMetrics",A.hd())
s.$2("sizing",A.ha())
s.$2("smartTrade",A.hb())
s.$2("goalPlan",A.h5())
s.$2("projection",A.h6())
s.$2("entitlement",A.h3())
s.$2("riskMath",A.h7())
s.$2("checklist",A.h1())
s.$2("flowsHistory",A.h4())
v.G.radarCalc=t},
cD:function cD(a){this.a=a},
cE:function cE(a){this.a=a},
hH(a){throw A.q(new A.bi("Field '"+a+"' has been assigned during initialization."),new Error())},
fo(a,b,c){if(c>=1)return a.$1(b)
return a.$0()},
U(a,b){var t
if(!isFinite(a)||!isFinite(b)||b===0)return null
t=a/b
return isFinite(t)?t:null},
dT(a,b){var t
if(!isFinite(a)||!isFinite(b))return 0
if(a<=0||b<=0)return 0
t=a*b
return isFinite(t)?t:0},
dW(a,b,c){var t,s,r,q=null
if(!isFinite(a)||!isFinite(c)||!isFinite(b))return q
if(b<=0)return q
t=a-c
if(t<=0)return q
s=A.U(b,t)
if(s==null)return q
r=B.d.aa(s+1e-9)
return r>0?r:0},
ay(a){var t
if(!isFinite(a))return null
t=B.d.af(a*100)/100
return isFinite(t)?t:null},
cX(a,b){if(a==null||!isFinite(a))return!1
return a-b>-1e-9},
cA(a,b){if(!isFinite(a)||!isFinite(b))return!1
return a-b>1e-9}},B={}
var w=[A,J,B]
var $={}
A.cI.prototype={}
J.bb.prototype={
G(a,b){return a===b},
gp(a){return A.bo(a)},
j(a){return"Instance of '"+A.bp(a)+"'"},
gF(a){return A.ag(A.cS(this))}}
J.bd.prototype={
j(a){return String(a)},
gp(a){return a?519018:218159},
gF(a){return A.ag(u.y)},
$iR:1,
$iaY:1}
J.aE.prototype={
G(a,b){return null==b},
j(a){return"null"},
gp(a){return 0},
$iR:1}
J.aq.prototype={$iap:1}
J.Y.prototype={
gp(a){return 0},
j(a){return String(a)}}
J.cd.prototype={}
J.a0.prototype={}
J.aF.prototype={
j(a){var t=a[$.dZ()]
if(t==null)t=a[$.cZ()]
if(t==null)return this.aj(a)
return"JavaScript function for "+J.b_(t)}}
J.e.prototype={
aF(a,b){var t,s,r=a.length
if(r===0)throw A.b(A.cH())
t=a[0]
for(s=1;s<r;++s){t=b.$2(t,a[s])
if(r!==a.length)throw A.b(A.W(a))}return t},
aB(a,b,c){var t,s,r,q=a.length
for(t=0;t<q;++t){s=a[t]
if(b.$1(s))return s
if(a.length!==q)throw A.b(A.W(a))}r=c.$0()
return r},
E(a,b){return a[b]},
gH(a){if(a.length>0)return a[0]
throw A.b(A.cH())},
gae(a){var t=a.length
if(t>0)return a[t-1]
throw A.b(A.cH())},
A(a,b){var t,s,r,q,p
a.$flags&2&&A.hI(a,"sort")
t=a.length
if(t<2)return
if(b==null)b=J.fz()
if(t===2){s=a[0]
r=a[1]
if(b.$2(s,r)>0){a[0]=r
a[1]=s}return}q=0
if(A.t(a).c.b(null))for(p=0;p<a.length;++p)if(a[p]===void 0){a[p]=null;++q}a.sort(A.hg(b,2))
if(q>0)this.ap(a,q)},
a3(a){return this.A(a,null)},
ap(a,b){var t,s=a.length
for(;t=s-1,s>0;s=t)if(a[t]===null){a[t]=void 0;--b
if(b===0)break}},
j(a){return A.d9(a,"[","]")},
gt(a){return new J.ak(a,a.length,A.t(a).i("ak<1>"))},
gp(a){return A.bo(a)},
gm(a){return a.length},
$ik:1,
$iZ:1}
J.bc.prototype={
aH(a){var t,s,r
if(!Array.isArray(a))return null
t=a.$flags|0
if((t&4)!==0)s="const, "
else if((t&2)!==0)s="unmodifiable, "
else s=(t&1)!==0?"fixed, ":""
r="Instance of '"+A.bp(a)+"'"
if(s==="")return r
return r+" ("+s+"length: "+a.length+")"}}
J.bX.prototype={}
J.ak.prototype={
gn(){var t=this.d
return t==null?this.$ti.c.a(t):t},
l(){var t,s=this,r=s.a,q=r.length
if(s.b!==q)throw A.b(A.r(r))
t=s.c
if(t>=q){s.d=null
return!1}s.d=r[t]
s.c=t+1
return!0}}
J.ao.prototype={
k(a,b){var t
if(a<b)return-1
else if(a>b)return 1
else if(a===b){if(a===0){t=this.ga2(b)
if(this.ga2(a)===t)return 0
if(this.ga2(a))return-1
return 1}return 0}else if(isNaN(a)){if(isNaN(b))return 0
return 1}else return-1},
ga2(a){return a===0?1/a<0:a<0},
S(a){var t
if(a>=-2147483648&&a<=2147483647)return a|0
if(isFinite(a)){t=a<0?Math.ceil(a):Math.floor(a)
return t+0}throw A.b(A.bx(""+a+".toInt()"))},
a8(a){var t,s
if(a>=0){if(a<=2147483647){t=a|0
return a===t?t:t+1}}else if(a>=-2147483648)return a|0
s=Math.ceil(a)
if(isFinite(s))return s
throw A.b(A.bx(""+a+".ceil()"))},
aa(a){var t,s
if(a>=0){if(a<=2147483647)return a|0}else if(a>=-2147483648){t=a|0
return a===t?t:t-1}s=Math.floor(a)
if(isFinite(s))return s
throw A.b(A.bx(""+a+".floor()"))},
af(a){if(a>0){if(a!==1/0)return Math.round(a)}else if(a>-1/0)return 0-Math.round(0-a)
throw A.b(A.bx(""+a+".round()"))},
av(a,b,c){if(B.a.k(b,c)>0)throw A.b(A.h_(b))
if(this.k(a,b)<0)return b
if(this.k(a,c)>0)return c
return a},
j(a){if(a===0&&1/a<0)return"-0.0"
else return""+a},
gp(a){var t,s,r,q,p=a|0
if(a===p)return p&536870911
t=Math.abs(a)
s=Math.log(t)/0.6931471805599453|0
r=Math.pow(2,s)
q=t<1?t/r:r/t
return((q*9007199254740992|0)+(q*3542243181176521|0))*599197+s*1259&536870911},
L(a,b){var t=a%b
if(t===0)return 0
if(t>0)return t
return t+b},
v(a,b){return(a|0)===a?a/b|0:this.au(a,b)},
au(a,b){var t=a/b
if(t>=-2147483648&&t<=2147483647)return t|0
if(t>0){if(t!==1/0)return Math.floor(t)}else if(t>-1/0)return Math.ceil(t)
throw A.b(A.bx("Result of truncating division is "+A.m(t)+": "+A.m(a)+" ~/ "+b))},
a7(a,b){var t
if(a>0)t=this.aq(a,b)
else{t=b>31?31:b
t=a>>t>>>0}return t},
aq(a,b){return b>31?0:a>>>b},
gF(a){return A.ag(u.H)},
$iz:1}
J.aD.prototype={
gF(a){return A.ag(u.S)},
$iR:1,
$iw:1}
J.be.prototype={
gF(a){return A.ag(u.i)},
$iR:1}
J.a6.prototype={
M(a,b,c){return a.substring(b,A.eR(b,c,a.length))},
P(a){var t,s,r,q=a.trim(),p=q.length
if(p===0)return q
if(q.charCodeAt(0)===133){t=J.eA(q,1)
if(t===p)return""}else t=0
s=p-1
r=q.charCodeAt(s)===133?J.eB(q,s):p
if(t===0&&r===p)return q
return q.substring(t,r)},
ai(a,b){var t,s
if(0>=b)return""
if(b===1||a.length===0)return a
if(b!==b>>>0)throw A.b(B.u)
for(t=a,s="";;){if((b&1)===1)s=t+s
b=b>>>1
if(b===0)break
t+=t}return s},
aE(a,b,c){var t=b-a.length
if(t<=0)return a
return this.ai(c,t)+a},
k(a,b){var t
if(a===b)t=0
else t=a<b?-1:1
return t},
j(a){return a},
gp(a){var t,s,r
for(t=a.length,s=0,r=0;r<t;++r){s=s+a.charCodeAt(r)&536870911
s=s+((s&524287)<<10)&536870911
s^=s>>6}s=s+((s&67108863)<<3)&536870911
s^=s>>11
return s+((s&16383)<<15)&536870911},
gF(a){return A.ag(u.N)},
$iR:1,
$ia:1}
A.bi.prototype={
j(a){return"LateInitializationError: "+this.a}}
A.cf.prototype={}
A.k.prototype={}
A.j.prototype={
gt(a){var t=this
return new A.ar(t,t.gm(t),A.x(t).i("ar<j.E>"))},
gJ(a){return this.gm(this)===0},
aG(a){var t,s=this,r=A.eG(A.x(s).i("j.E"))
for(t=0;t<s.gm(s);++t)r.O(0,s.E(0,t))
return r}}
A.aO.prototype={
gam(){var t=this.a.length
return t},
gar(){var t=this.a.length,s=this.b
if(s>t)return t
return s},
gm(a){var t=this.a.length,s=this.b
if(s>=t)return 0
return t-s},
E(a,b){var t=this,s=t.gar()+b,r=t.gam()
if(s>=r)throw A.b(A.d8(b,t.gm(0),t,"index"))
return t.a[s]}}
A.ar.prototype={
gn(){var t=this.d
return t==null?this.$ti.c.a(t):t},
l(){var t,s=this,r=s.a,q=r.gm(r)
if(s.b!==q)throw A.b(A.W(r))
t=s.c
if(t>=q){s.d=null
return!1}s.d=r.E(0,t);++s.c
return!0}}
A.a8.prototype={
gt(a){var t=this.a
return new A.bl(t.gt(t),this.b,A.x(this).i("bl<1,2>"))}}
A.aB.prototype={$ik:1}
A.bl.prototype={
l(){var t=this,s=t.b
if(s.l()){t.a=t.c.$1(s.gn())
return!0}t.a=null
return!1},
gn(){var t=this.a
return t==null?this.$ti.y[1].a(t):t}}
A.i.prototype={
gm(a){return J.ee(this.a)},
E(a,b){return this.b.$1(J.ed(this.a,b))}}
A.aL.prototype={}
A.ck.prototype={
C(a){var t,s,r=this,q=new RegExp(r.a).exec(a)
if(q==null)return null
t=Object.create(null)
s=r.b
if(s!==-1)t.arguments=q[s+1]
s=r.c
if(s!==-1)t.argumentsExpr=q[s+1]
s=r.d
if(s!==-1)t.expr=q[s+1]
s=r.e
if(s!==-1)t.method=q[s+1]
s=r.f
if(s!==-1)t.receiver=q[s+1]
return t}}
A.aI.prototype={
j(a){return"Null check operator used on a null value"}}
A.bg.prototype={
j(a){var t,s=this,r="NoSuchMethodError: method not found: '",q=s.b
if(q==null)return"NoSuchMethodError: "+s.a
t=s.c
if(t==null)return r+q+"' ("+s.a+")"
return r+q+"' on '"+t+"' ("+s.a+")"}}
A.bw.prototype={
j(a){var t=this.a
return t.length===0?"Error":"Error: "+t}}
A.cc.prototype={
j(a){return"Throw of null ('"+(this.a===null?"null":"undefined")+"' from JavaScript)"}}
A.a4.prototype={
j(a){var t=this.constructor,s=t==null?null:t.name
return"Closure '"+A.dY(s==null?"unknown":s)+"'"},
gaK(){return this},
$C:"$1",
$R:1,
$D:null}
A.bJ.prototype={$C:"$0",$R:0}
A.bK.prototype={$C:"$2",$R:2}
A.ci.prototype={}
A.ch.prototype={
j(a){var t=this.$static_name
if(t==null)return"Closure of unknown static method"
return"Closure '"+A.dY(t)+"'"}}
A.az.prototype={
G(a,b){if(b==null)return!1
if(this===b)return!0
if(!(b instanceof A.az))return!1
return this.$_target===b.$_target&&this.a===b.a},
gp(a){return(A.dV(this.a)^A.bo(this.$_target))>>>0},
j(a){return"Closure '"+this.$_name+"' of "+("Instance of '"+A.bp(this.a)+"'")}}
A.br.prototype={
j(a){return"RuntimeError: "+this.a}}
A.L.prototype={
gm(a){return this.a},
gJ(a){return this.a===0},
gK(){return new A.N(this,A.x(this).i("N<1>"))},
h(a,b){var t,s,r,q,p=null
if(typeof b=="string"){t=this.b
if(t==null)return p
s=t[b]
r=s==null?p:s.b
return r}else if(typeof b=="number"&&(b&0x3fffffff)===b){q=this.c
if(q==null)return p
s=q[b]
r=s==null?p:s.b
return r}else return this.aC(b)},
aC(a){var t,s,r=this.d
if(r==null)return null
t=r[this.ab(a)]
s=this.ac(t,a)
if(s<0)return null
return t[s].b},
B(a,b,c){var t,s,r=this
if(typeof b=="string"){t=r.b
r.a4(t==null?r.b=r.a_():t,b,c)}else if(typeof b=="number"&&(b&0x3fffffff)===b){s=r.c
r.a4(s==null?r.c=r.a_():s,b,c)}else r.aD(b,c)},
aD(a,b){var t,s,r,q=this,p=q.d
if(p==null)p=q.d=q.a_()
t=q.ab(a)
s=p[t]
if(s==null)p[t]=[q.a0(a,b)]
else{r=q.ac(s,a)
if(r>=0)s[r].b=b
else s.push(q.a0(a,b))}},
I(a,b){var t=this,s=t.e,r=t.r
while(s!=null){b.$2(s.a,s.b)
if(r!==t.r)throw A.b(A.W(t))
s=s.c}},
a4(a,b,c){var t=a[b]
if(t==null)a[b]=this.a0(b,c)
else t.b=c},
a0(a,b){var t=this,s=new A.c9(a,b)
if(t.e==null)t.e=t.f=s
else t.f=t.f.c=s;++t.a
t.r=t.r+1&1073741823
return s},
ab(a){return J.bH(a)&1073741823},
ac(a,b){var t,s
if(a==null)return-1
t=a.length
for(s=0;s<t;++s)if(J.cG(a[s].a,b))return s
return-1},
j(a){return A.de(this)},
a_(){var t=Object.create(null)
t["<non-identifier-key>"]=t
delete t["<non-identifier-key>"]
return t}}
A.c9.prototype={}
A.N.prototype={
gm(a){return this.a.a},
gJ(a){return this.a.a===0},
gt(a){var t=this.a
return new A.bk(t,t.r,t.e)}}
A.bk.prototype={
gn(){return this.d},
l(){var t,s=this,r=s.a
if(s.b!==r.r)throw A.b(A.W(r))
t=s.c
if(t==null){s.d=null
return!1}else{s.d=t.a
s.c=t.c
return!0}}}
A.M.prototype={
gt(a){var t=this.a
return new A.bj(t,t.r,t.e,this.$ti.i("bj<1,2>"))}}
A.bj.prototype={
gn(){var t=this.d
t.toString
return t},
l(){var t,s=this,r=s.a
if(s.b!==r.r)throw A.b(A.W(r))
t=s.c
if(t==null){s.d=null
return!1}else{s.d=new A.O(t.a,t.b,s.$ti.i("O<1,2>"))
s.c=t.c
return!0}}}
A.bW.prototype={
j(a){return"RegExp/"+this.a+"/"+this.b.flags},
aA(a){var t=this.b.exec(a)
if(t==null)return null
return new A.cs(t)}}
A.cs.prototype={}
A.F.prototype={
i(a){return A.cv(v.typeUniverse,this,a)},
N(a){return A.fa(v.typeUniverse,this,a)}}
A.bz.prototype={}
A.ct.prototype={
j(a){return A.y(this.a,null)}}
A.by.prototype={
j(a){return this.a}}
A.aU.prototype={}
A.ac.prototype={
gt(a){var t=this,s=new A.av(t,t.r,A.x(t).i("av<1>"))
s.c=t.e
return s},
O(a,b){var t,s,r=this
if(typeof b=="string"&&b!=="__proto__"){t=r.b
return r.a5(t==null?r.b=A.cP():t,b)}else if(typeof b=="number"&&(b&1073741823)===b){s=r.c
return r.a5(s==null?r.c=A.cP():s,b)}else return r.ak(b)},
ak(a){var t,s,r=this,q=r.d
if(q==null)q=r.d=A.cP()
t=r.al(a)
s=q[t]
if(s==null)q[t]=[r.X(a)]
else{if(r.an(s,a)>=0)return!1
s.push(r.X(a))}return!0},
a5(a,b){if(a[b]!=null)return!1
a[b]=this.X(b)
return!0},
X(a){var t=this,s=new A.cr(a)
if(t.e==null)t.e=t.f=s
else t.f=t.f.b=s;++t.a
t.r=t.r+1&1073741823
return s},
al(a){return J.bH(a)&1073741823},
an(a,b){var t,s
if(a==null)return-1
t=a.length
for(s=0;s<t;++s)if(J.cG(a[s].a,b))return s
return-1}}
A.cr.prototype={}
A.av.prototype={
gn(){var t=this.d
return t==null?this.$ti.c.a(t):t},
l(){var t=this,s=t.c,r=t.a
if(t.b!==r.r)throw A.b(A.W(r))
else if(s==null){t.d=null
return!1}else{t.d=s.a
t.c=s.b
return!0}}}
A.ca.prototype={
$2(a,b){this.a.B(0,this.b.a(a),this.c.a(b))},
$S:5}
A.C.prototype={
I(a,b){var t,s,r,q
for(t=this.gK(),t=t.gt(t),s=A.x(this).i("C.V");t.l();){r=t.gn()
q=this.h(0,r)
b.$2(r,q==null?s.a(q):q)}},
gm(a){var t=this.gK()
return t.gm(t)},
gJ(a){var t=this.gK()
return t.gJ(t)},
j(a){return A.de(this)},
$if:1}
A.cb.prototype={
$2(a,b){var t,s=this.a
if(!s.a)this.b.a+=", "
s.a=!1
s=this.b
t=A.m(a)
s.a=(s.a+=t)+": "
t=A.m(b)
s.a+=t},
$S:2}
A.at.prototype={
j(a){return A.d9(this,"{","}")},
$ik:1}
A.aT.prototype={}
A.bA.prototype={
h(a,b){var t,s=this.b
if(s==null)return this.c.h(0,b)
else if(typeof b!="string")return null
else{t=s[b]
return typeof t=="undefined"?this.ao(b):t}},
gm(a){return this.b==null?this.c.a:this.R().length},
gJ(a){return this.gm(0)===0},
gK(){if(this.b==null){var t=this.c
return new A.N(t,A.x(t).i("N<1>"))}return new A.bB(this)},
I(a,b){var t,s,r,q,p=this
if(p.b==null)return p.c.I(0,b)
t=p.R()
for(s=0;s<t.length;++s){r=t[s]
q=p.b[r]
if(typeof q=="undefined"){q=A.cx(p.a[r])
p.b[r]=q}b.$2(r,q)
if(t!==p.c)throw A.b(A.W(p))}},
R(){var t=this.c
if(t==null)t=this.c=A.d(Object.keys(this.a),u.s)
return t},
ao(a){var t
if(!Object.prototype.hasOwnProperty.call(this.a,a))return null
t=A.cx(this.a[a])
return this.b[a]=t}}
A.bB.prototype={
gm(a){return this.a.gm(0)},
E(a,b){var t=this.a
return t.b==null?t.gK().E(0,b):t.R()[b]},
gt(a){var t=this.a
if(t.b==null){t=t.gK()
t=t.gt(t)}else{t=t.R()
t=new J.ak(t,t.length,A.t(t).i("ak<1>"))}return t}}
A.b2.prototype={}
A.b4.prototype={}
A.aG.prototype={
j(a){var t=A.b6(this.a)
return(this.b!=null?"Converting object to an encodable object failed:":"Converting object did not return an encodable object:")+" "+t}}
A.bh.prototype={
j(a){return"Cyclic error in JSON stringify"}}
A.c6.prototype={
u(a,b){var t=A.fO(a,this.gaw().a)
return t},
q(a,b){var t=A.eX(a,this.gaz().b,null)
return t},
gaz(){return B.N},
gaw(){return B.M}}
A.c8.prototype={}
A.c7.prototype={}
A.cp.prototype={
ah(a){var t,s,r,q,p,o,n=a.length
for(t=this.c,s=0,r=0;r<n;++r){q=a.charCodeAt(r)
if(q>92){if(q>=55296){p=q&64512
if(p===55296){o=r+1
o=!(o<n&&(a.charCodeAt(o)&64512)===56320)}else o=!1
if(!o)if(p===56320){p=r-1
p=!(p>=0&&(a.charCodeAt(p)&64512)===55296)}else p=!1
else p=!0
if(p){if(r>s)t.a+=B.e.M(a,s,r)
s=r+1
p=A.p(92)
t.a+=p
p=A.p(117)
t.a+=p
p=A.p(100)
t.a+=p
p=q>>>8&15
p=A.p(p<10?48+p:87+p)
t.a+=p
p=q>>>4&15
p=A.p(p<10?48+p:87+p)
t.a+=p
p=q&15
p=A.p(p<10?48+p:87+p)
t.a+=p}}continue}if(q<32){if(r>s)t.a+=B.e.M(a,s,r)
s=r+1
p=A.p(92)
t.a+=p
switch(q){case 8:p=A.p(98)
t.a+=p
break
case 9:p=A.p(116)
t.a+=p
break
case 10:p=A.p(110)
t.a+=p
break
case 12:p=A.p(102)
t.a+=p
break
case 13:p=A.p(114)
t.a+=p
break
default:p=A.p(117)
t.a+=p
p=A.p(48)
t.a=(t.a+=p)+p
p=q>>>4&15
p=A.p(p<10?48+p:87+p)
t.a+=p
p=q&15
p=A.p(p<10?48+p:87+p)
t.a+=p
break}}else if(q===34||q===92){if(r>s)t.a+=B.e.M(a,s,r)
s=r+1
p=A.p(92)
t.a+=p
p=A.p(q)
t.a+=p}}if(s===0)t.a+=a
else if(s<n)t.a+=B.e.M(a,s,n)},
W(a){var t,s,r,q
for(t=this.a,s=t.length,r=0;r<s;++r){q=t[r]
if(a==null?q==null:a===q)throw A.b(new A.bh(a,null))}t.push(a)},
U(a){var t,s,r,q,p=this
if(p.ag(a))return
p.W(a)
try{t=p.b.$1(a)
if(!p.ag(t)){r=A.dd(a,null,p.ga6())
throw A.b(r)}p.a.pop()}catch(q){s=A.cY(q)
r=A.dd(a,s,p.ga6())
throw A.b(r)}},
ag(a){var t,s,r=this
if(typeof a=="number"){if(!isFinite(a))return!1
r.c.a+=B.d.j(a)
return!0}else if(a===!0){r.c.a+="true"
return!0}else if(a===!1){r.c.a+="false"
return!0}else if(a==null){r.c.a+="null"
return!0}else if(typeof a=="string"){t=r.c
t.a+='"'
r.ah(a)
t.a+='"'
return!0}else if(u.j.b(a)){r.W(a)
r.aI(a)
r.a.pop()
return!0}else if(a instanceof A.C){r.W(a)
s=r.aJ(a)
r.a.pop()
return s}else return!1},
aI(a){var t,s=this.c
s.a+="["
if(a.length!==0){this.U(a[0])
for(t=1;t<a.length;++t){s.a+=","
this.U(a[t])}}s.a+="]"},
aJ(a){var t,s,r,q,p,o=this,n={}
if(a.gJ(a)){o.c.a+="{}"
return!0}t=a.gm(a)*2
s=A.eI(t,null,!1,u.X)
r=n.a=0
n.b=!0
a.I(0,new A.cq(n,s))
if(!n.b)return!1
q=o.c
q.a+="{"
for(p='"';r<t;r+=2,p=',"'){q.a+=p
o.ah(A.dE(s[r]))
q.a+='":'
o.U(s[r+1])}q.a+="}"
return!0}}
A.cq.prototype={
$2(a,b){var t,s,r,q
if(typeof a!="string")this.a.b=!1
t=this.b
s=this.a
r=s.a
q=s.a=r+1
t[r]=a
s.a=q+1
t[q]=b},
$S:2}
A.co.prototype={
ga6(){var t=this.c.a
return t.charCodeAt(0)==0?t:t}}
A.bS.prototype={
$0(){var t=this
return A.cF(A.bI("("+t.a+", "+t.b+", "+t.c+", "+t.d+", "+t.e+", "+t.f+", "+t.r+", "+t.w+")"))},
$S:6}
A.A.prototype={
V(a){var t=1000,s=B.a.L(a,t),r=B.a.v(a-s,t),q=this.b+s,p=B.a.L(q,t),o=this.c
return new A.A(A.d6(this.a+B.a.v(q-p,t)+r,p,o),p,o)},
a9(a){return A.eu(0,this.b-a.b,this.a-a.a)},
G(a,b){if(b==null)return!1
return b instanceof A.A&&this.a===b.a&&this.b===b.b&&this.c===b.c},
gp(a){return A.eL(this.a,this.b)},
ad(a){var t=this.a,s=a.a
if(t<=s)t=t===s&&this.b>a.b
else t=!0
return t},
k(a,b){var t=B.a.k(this.a,b.a)
if(t!==0)return t
return B.a.k(this.b,b.b)},
j(a){var t=this,s=A.d5(A.H(t)),r=A.J(A.Q(t)),q=A.J(A.as(t)),p=A.J(A.dg(t)),o=A.J(A.di(t)),n=A.J(A.dj(t)),m=A.bT(A.dh(t)),l=t.b,k=l===0?"":A.bT(l)
l=s+"-"+r
if(t.c)return l+"-"+q+" "+p+":"+o+":"+n+"."+m+k+"Z"
else return l+"-"+q+" "+p+":"+o+":"+n+"."+m+k},
T(){var t=this,s=A.H(t)>=-9999&&A.H(t)<=9999?A.d5(A.H(t)):A.es(A.H(t)),r=A.J(A.Q(t)),q=A.J(A.as(t)),p=A.J(A.dg(t)),o=A.J(A.di(t)),n=A.J(A.dj(t)),m=A.bT(A.dh(t)),l=t.b,k=l===0?"":A.bT(l)
l=s+"-"+r
if(t.c)return l+"-"+q+"T"+p+":"+o+":"+n+"."+m+k+"Z"
else return l+"-"+q+"T"+p+":"+o+":"+n+"."+m+k}}
A.bU.prototype={
$1(a){if(a==null)return 0
return A.bG(a)},
$S:3}
A.bV.prototype={
$1(a){var t,s,r
if(a==null)return 0
for(t=a.length,s=0,r=0;r<6;++r){s*=10
if(r<t)s+=a.charCodeAt(r)^48}return s},
$S:3}
A.b5.prototype={
G(a,b){if(b==null)return!1
return b instanceof A.b5&&this.a===b.a},
gp(a){return B.a.gp(this.a)},
k(a,b){return B.a.k(this.a,b.a)},
j(a){var t,s,r,q,p,o=this.a,n=B.a.v(o,36e8),m=o%36e8
if(o<0){n=0-n
o=0-m
t="-"}else{o=m
t=""}s=B.a.v(o,6e7)
o%=6e7
r=s<10?"0":""
q=B.a.v(o,1e6)
p=q<10?"0":""
return t+n+":"+r+s+":"+p+q+"."+B.e.aE(B.a.j(o%1e6),6,"0")}}
A.cm.prototype={
j(a){return this.D()}}
A.h.prototype={}
A.b0.prototype={
j(a){var t=this.a
if(t!=null)return"Assertion failed: "+A.b6(t)
return"Assertion failed"}}
A.aQ.prototype={}
A.V.prototype={
gZ(){return"Invalid argument"+(!this.a?"(s)":"")},
gY(){return""},
j(a){var t=this,s=t.c,r=s==null?"":" ("+s+")",q=t.d,p=q==null?"":": "+q,o=t.gZ()+r+p
if(!t.a)return o
return o+t.gY()+": "+A.b6(t.ga1())},
ga1(){return this.b}}
A.bq.prototype={
ga1(){return this.b},
gZ(){return"RangeError"},
gY(){var t,s=this.e,r=this.f
if(s==null)t=r!=null?": Not less than or equal to "+A.m(r):""
else if(r==null)t=": Not greater than or equal to "+A.m(s)
else if(r>s)t=": Not in inclusive range "+A.m(s)+".."+A.m(r)
else t=r<s?": Valid value range is empty":": Only valid value is "+A.m(s)
return t}}
A.ba.prototype={
ga1(){return this.b},
gZ(){return"RangeError"},
gY(){if(this.b<0)return": index must not be negative"
var t=this.f
if(t===0)return": no indices are valid"
return": index should be less than "+t}}
A.aR.prototype={
j(a){return"Unsupported operation: "+this.a}}
A.bs.prototype={
j(a){return"Bad state: "+this.a}}
A.b3.prototype={
j(a){var t=this.a
if(t==null)return"Concurrent modification during iteration."
return"Concurrent modification during iteration: "+A.b6(t)+"."}}
A.bm.prototype={
j(a){return"Out of Memory"},
$ih:1}
A.aM.prototype={
j(a){return"Stack Overflow"},
$ih:1}
A.cn.prototype={
j(a){return"Exception: "+this.a}}
A.b8.prototype={
j(a){var t=this.a,s=""!==t?"FormatException: "+t:"FormatException",r=this.b
if(typeof r=="string"){if(r.length>78)r=B.e.M(r,0,75)+"..."
return s+"\n"+r}else return s}}
A.l.prototype={
gm(a){var t,s=this.gt(this)
for(t=0;s.l();)++t
return t},
E(a,b){var t,s
A.dl(b,"index")
t=this.gt(this)
for(s=b;t.l();){if(s===0)return t.gn();--s}throw A.b(A.d8(b,b-s,this,"index"))},
j(a){return A.ev(this,"(",")")}}
A.O.prototype={
j(a){return"MapEntry("+A.m(this.a)+": "+A.m(this.b)+")"}}
A.aH.prototype={
gp(a){return A.c.prototype.gp.call(this,0)},
j(a){return"null"}}
A.c.prototype={$ic:1,
G(a,b){return this===b},
gp(a){return A.bo(this)},
j(a){return"Instance of '"+A.bp(this)+"'"},
gF(a){return A.hs(this)},
toString(){return this.j(this)}}
A.aN.prototype={
j(a){var t=this.a
return t.charCodeAt(0)==0?t:t}}
A.aJ.prototype={
D(){return"Plan."+this.b}}
A.a5.prototype={
D(){return"Feature."+this.b}}
A.am.prototype={}
A.E.prototype={}
A.bL.prototype={}
A.bM.prototype={
$2(a,b){var t,s=b.b.c
if(s==null)s=0
t=a.b.c
return B.d.k(s,t==null?0:t)},
$S:1}
A.bN.prototype={
$2(a,b){return B.a.k(b.c,a.c)},
$S:1}
A.bO.prototype={
$2(a,b){return B.a.k(a.c,b.c)},
$S:1}
A.bP.prototype={
$2(a,b){return B.a.k(b.d,a.d)},
$S:1}
A.bQ.prototype={
$2(a,b){return B.a.k(b.c,a.c)},
$S:1}
A.bR.prototype={
$2(a,b){var t,s=b.a.x
s.toString
t=a.a.x
t.toString
return s.k(0,t)},
$S:1}
A.b7.prototype={}
A.K.prototype={
D(){return"GoalPlanMode."+this.b}}
A.aC.prototype={}
A.aa.prototype={
D(){return"ProjectionKind."+this.b}}
A.X.prototype={}
A.a9.prototype={}
A.v.prototype={}
A.bu.prototype={}
A.bf.prototype={}
A.bY.prototype={
$2(a,b){var t,s,r=a.x
r.toString
t=b.x
t.toString
s=r.k(0,t)
return s!==0?s:B.e.k(a.a,b.a)},
$S:4}
A.bZ.prototype={
$1(a){return B.e.P(a)},
$S:0}
A.c0.prototype={
$1(a){var t=A.x(a).i("M<1,2>")
t=A.eK(new A.M(a,t),new A.c1(),t.i("l.E"),u.M)
t=A.B(t,A.x(t).i("l.E"))
B.c.A(t,new A.c2())
return t},
$S:7}
A.c1.prototype={
$1(a){var t=a.b
return new A.v(a.a,t.a,t.b,t.c)},
$S:8}
A.c2.prototype={
$2(a,b){var t=B.d.k(b.b,a.b)
return t!==0?t:B.e.k(a.a,b.a)},
$S:9}
A.c_.prototype={
$2(a,b){return a+b},
$S:10}
A.aS.prototype={}
A.T.prototype={
O(a,b){this.a+=b;++this.b
if(b>0)++this.c}}
A.an.prototype={}
A.c4.prototype={}
A.c5.prototype={
$2(a,b){var t,s,r=a.x
r.toString
t=b.x
t.toString
s=r.k(0,t)
return s!==0?s:B.e.k(a.a,b.a)},
$S:4}
A.P.prototype={}
A.bn.prototype={}
A.ce.prototype={
$2(a,b){var t=B.d.k(b.c,a.c)
return t!==0?t:B.e.k(a.b,b.b)},
$S:11}
A.cM.prototype={}
A.cg.prototype={}
A.aP.prototype={
D(){return"TradeQuality."+this.b}}
A.cO.prototype={}
A.au.prototype={
D(){return"TradeResult."+this.b}}
A.cj.prototype={}
A.I.prototype={
D(){return"ChecklistItem."+this.b}}
A.bt.prototype={}
A.a_.prototype={}
A.ab.prototype={
D(){return"TradeStatus."+this.b}}
A.cB.prototype={
$1(a){return a.b===this.a.h(0,"mode")},
$S:12}
A.cC.prototype={
$0(){return B.j},
$S:13}
A.cD.prototype={
$2(a,b){var t,s=new A.cE(b)
if(typeof s=="function")A.cF(A.bI("Attempting to rewrap a JS function."))
t=function(c,d){return function(e){return c(d,e,arguments.length)}}(A.fo,s)
t[$.cZ()]=s
this.a[a]=t},
$S:14}
A.cE.prototype={
$1(a){return this.a.$1(a)},
$S:0};(function aliases(){var t=J.Y.prototype
t.aj=t.j})();(function installTearOffs(){var t=hunkHelpers._static_2,s=hunkHelpers._static_1
t(J,"fz","ez",15)
s(A,"hi","fq",16)
s(A,"dO","fP",17)
s(A,"dP","bD",18)
s(A,"aZ","fM",19)
s(A,"h0","fY",0)
s(A,"hc","hG",0)
s(A,"h2","hk",0)
s(A,"h9","hD",0)
s(A,"h8","hC",0)
s(A,"hd","hK",0)
s(A,"ha","hE",0)
s(A,"hb","hF",0)
s(A,"h5","hu",0)
s(A,"h6","hz",0)
s(A,"h3","hl",0)
s(A,"h7","hB",0)
s(A,"h1","he",0)
s(A,"h4","hp",0)})();(function inheritance(){var t=hunkHelpers.inherit,s=hunkHelpers.inheritMany
t(A.c,null)
s(A.c,[A.cI,J.bb,A.aL,J.ak,A.h,A.cf,A.l,A.ar,A.bl,A.ck,A.cc,A.a4,A.C,A.c9,A.bk,A.bj,A.bW,A.cs,A.F,A.bz,A.ct,A.at,A.cr,A.av,A.b2,A.b4,A.cp,A.A,A.b5,A.cm,A.bm,A.aM,A.cn,A.b8,A.O,A.aH,A.aN,A.am,A.E,A.bL,A.b7,A.aC,A.X,A.a9,A.v,A.bu,A.bf,A.aS,A.T,A.an,A.c4,A.P,A.bn,A.cM,A.cg,A.cO,A.cj,A.bt,A.a_])
s(J.bb,[J.bd,J.aE,J.aq,J.ao,J.a6])
s(J.aq,[J.Y,J.e])
s(J.Y,[J.cd,J.a0,J.aF])
t(J.bc,A.aL)
t(J.bX,J.e)
s(J.ao,[J.aD,J.be])
s(A.h,[A.bi,A.aQ,A.bg,A.bw,A.br,A.by,A.aG,A.b0,A.V,A.aR,A.bs,A.b3])
s(A.l,[A.k,A.a8])
s(A.k,[A.j,A.N,A.M])
s(A.j,[A.aO,A.i,A.bB])
t(A.aB,A.a8)
t(A.aI,A.aQ)
s(A.a4,[A.bJ,A.bK,A.ci,A.bU,A.bV,A.bZ,A.c0,A.c1,A.cB,A.cE])
s(A.ci,[A.ch,A.az])
s(A.C,[A.L,A.bA])
t(A.aU,A.by)
t(A.aT,A.at)
t(A.ac,A.aT)
s(A.bK,[A.ca,A.cb,A.cq,A.bM,A.bN,A.bO,A.bP,A.bQ,A.bR,A.bY,A.c2,A.c_,A.c5,A.ce,A.cD])
t(A.bh,A.aG)
t(A.c6,A.b2)
s(A.b4,[A.c8,A.c7])
t(A.co,A.cp)
s(A.bJ,[A.bS,A.cC])
s(A.V,[A.bq,A.ba])
s(A.cm,[A.aJ,A.a5,A.K,A.aa,A.aP,A.au,A.I,A.ab])})()
var v={G:typeof self!="undefined"?self:globalThis,typeUniverse:{eC:new Map(),tR:{},eT:{},tPV:{},sEA:[]},mangledGlobalNames:{w:"int",z:"double",dU:"num",a:"String",aY:"bool",aH:"Null",Z:"List",c:"Object",f:"Map",ap:"JSObject"},mangledNames:{},types:["a(a)","w(E,E)","~(c?,c?)","w(a?)","w(a_,a_)","~(@,@)","0&()","Z<v>(f<a,T>)","v(O<a,T>)","w(v,v)","z(z,z)","w(P,P)","aY(K)","K()","~(a,a(a))","w(@,@)","@(@)","f<a,c?>(a9)","f<a,c?>?(v?)","f<a,c?>(E)"],arrayRti:Symbol("$ti")}
A.f9(v.typeUniverse,JSON.parse('{"cd":"Y","a0":"Y","aF":"Y","bd":{"aY":[],"R":[]},"aE":{"R":[]},"aq":{"ap":[]},"Y":{"ap":[]},"e":{"Z":["1"],"k":["1"],"ap":[]},"bc":{"aL":[]},"bX":{"e":["1"],"Z":["1"],"k":["1"],"ap":[]},"ao":{"z":[]},"aD":{"z":[],"w":[],"R":[]},"be":{"z":[],"R":[]},"a6":{"a":[],"R":[]},"bi":{"h":[]},"k":{"l":["1"]},"j":{"k":["1"],"l":["1"]},"aO":{"j":["1"],"k":["1"],"l":["1"],"j.E":"1","l.E":"1"},"a8":{"l":["2"],"l.E":"2"},"aB":{"a8":["1","2"],"k":["2"],"l":["2"],"l.E":"2"},"i":{"j":["2"],"k":["2"],"l":["2"],"j.E":"2","l.E":"2"},"aI":{"h":[]},"bg":{"h":[]},"bw":{"h":[]},"br":{"h":[]},"L":{"C":["1","2"],"f":["1","2"],"C.V":"2"},"N":{"k":["1"],"l":["1"],"l.E":"1"},"M":{"k":["O<1,2>"],"l":["O<1,2>"],"l.E":"O<1,2>"},"by":{"h":[]},"aU":{"h":[]},"ac":{"at":["1"],"k":["1"]},"C":{"f":["1","2"]},"at":{"k":["1"]},"aT":{"at":["1"],"k":["1"]},"bA":{"C":["a","@"],"f":["a","@"],"C.V":"@"},"bB":{"j":["a"],"k":["a"],"l":["a"],"j.E":"a","l.E":"a"},"aG":{"h":[]},"bh":{"h":[]},"Z":{"k":["1"]},"b0":{"h":[]},"aQ":{"h":[]},"V":{"h":[]},"bq":{"h":[]},"ba":{"h":[]},"aR":{"h":[]},"bs":{"h":[]},"b3":{"h":[]},"bm":{"h":[]},"aM":{"h":[]}}'))
A.f8(v.typeUniverse,JSON.parse('{"k":1,"bk":1,"aT":1,"b2":2,"b4":2}'))
var u=(function rtii(){var t=A.a3
return{k:t("A"),G:t("E"),Q:t("k<@>"),I:t("an"),C:t("h"),Z:t("hP"),g:t("e<A>"),Y:t("e<E>"),t:t("e<an>"),x:t("e<f<a,c>>"),p:t("e<f<a,a>>"),o:t("e<P>"),s:t("e<a>"),O:t("e<bt>"),J:t("e<a_>"),n:t("e<z>"),b:t("e<@>"),c:t("e<z?>"),T:t("aE"),m:t("ap"),L:t("aF"),A:t("Z<f<a,c?>>"),j:t("Z<@>"),P:t("f<a,@>"),f:t("f<@,@>"),a:t("aH"),K:t("c"),R:t("P"),_:t("a9"),U:t("hQ"),N:t("a"),M:t("v"),l:t("R"),B:t("a0"),W:t("aS"),V:t("T"),y:t("aY"),i:t("z"),z:t("@"),S:t("w"),d:t("d7<aH>?"),D:t("ap?"),X:t("c?"),v:t("a?"),u:t("aY?"),w:t("z?"),E:t("w?"),F:t("dU?"),H:t("dU")}})();(function constants(){var t=hunkHelpers.makeConstList
B.J=J.bb.prototype
B.c=J.e.prototype
B.a=J.aD.prototype
B.d=J.ao.prototype
B.e=J.a6.prototype
B.K=J.aq.prototype
B.t=function getTagFallback(o) {
  var s = Object.prototype.toString.call(o);
  return s.substring(8, s.length - 1);
}
B.b=new A.c6()
B.u=new A.bm()
B.a8=new A.cf()
B.U=new A.aJ(1,"pro")
B.B=new A.am(B.U,null)
B.p=new A.aJ(2,"free")
B.C=new A.am(B.p,0)
B.i=new A.am(B.p,null)
B.j=new A.K(0,"targetToMonthly")
B.k=new A.K(1,"monthlyToTarget")
B.X=new A.aa(1,"alreadyThere")
B.H=new A.X(B.X,0,!1,null,null,null,null,0)
B.Z=new A.aa(4,"noCapital")
B.I=new A.X(B.Z,0,!1,null,null,null,null,0)
B.m=t([],A.a3("e<a9>"))
B.n=t([],A.a3("e<v>"))
B.L=new A.bf(null,0,0,null,null,null,0,null,null,B.m,B.m,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,B.n,null,null,B.n,null,null)
B.M=new A.c7(null)
B.N=new A.c8(null)
B.y=new A.I("trend","\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0645\u0624\u0643\u062f",0,"trend")
B.x=new A.I("levels","\u0627\u0644\u062f\u0639\u0645/\u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629 \u0645\u0624\u0643\u062f\u0629",1,"levels")
B.w=new A.I("volume","\u0627\u0644\u062d\u062c\u0645 \u0645\u0624\u0643\u062f",2,"volume")
B.z=new A.I("risk","\u0627\u0644\u0645\u062e\u0627\u0637\u0631\u0629 \u0645\u0642\u0628\u0648\u0644\u0629",3,"risk")
B.v=new A.I("size","\u062d\u062c\u0645 \u0627\u0644\u0645\u0631\u0643\u0632 \u0645\u062d\u0633\u0648\u0628",4,"size")
B.A=new A.I("news","\u0627\u0644\u0623\u062e\u0628\u0627\u0631 \u0645\u062a\u0627\u0628\u064e\u0639\u0629",5,"news")
B.l=t([B.y,B.x,B.w,B.z,B.v,B.A],A.a3("e<I>"))
B.a5=new A.ab(0,"planned")
B.f=new A.ab(1,"open")
B.h=new A.ab(2,"closed")
B.a6=new A.ab(3,"cancelled")
B.O=t([B.a5,B.f,B.h,B.a6],A.a3("e<ab>"))
B.P=t([B.j,B.k],A.a3("e<K>"))
B.D=new A.a5(0,"marketFlows")
B.E=new A.a5(1,"livePrices")
B.F=new A.a5(2,"aiReader")
B.G=new A.a5(3,"analytics")
B.Q=t([B.D,B.E,B.F,B.G],A.a3("e<a5>"))
B.R=t([],u.s)
B.S=t([],u.J)
B.o=new A.aJ(0,"trial")
B.T=t([],u.o)
B.V=new A.bn(0,null,null,B.T)
B.W=new A.aa(0,"reachable")
B.q=new A.aa(2,"notEnoughHistory")
B.Y=new A.aa(3,"noEdge")
B.a_=new A.aP(0,"good")
B.a0=new A.aP(1,"warning")
B.a1=new A.aP(2,"bad")
B.r=new A.au(0,"open")
B.a2=new A.au(1,"win")
B.a3=new A.au(2,"loss")
B.a4=new A.au(3,"breakeven")
B.a7=A.hL("c")})();(function staticFields(){$.af=A.d([],A.a3("e<c>"))
$.df=null
$.d2=null
$.d1=null})();(function lazyInitializers(){var t=hunkHelpers.lazyFinal
t($,"hN","dZ",()=>A.dS("_$dart_dartClosure"))
t($,"hM","cZ",()=>A.dS("_$dart_dartClosure_dartJSInterop"))
t($,"i1","eb",()=>A.d([new J.bc()],A.a3("e<aL>")))
t($,"hR","e0",()=>A.S(A.cl({
toString:function(){return"$receiver$"}})))
t($,"hS","e1",()=>A.S(A.cl({$method$:null,
toString:function(){return"$receiver$"}})))
t($,"hT","e2",()=>A.S(A.cl(null)))
t($,"hU","e3",()=>A.S(function(){var $argumentsExpr$="$arguments$"
try{null.$method$($argumentsExpr$)}catch(s){return s.message}}()))
t($,"hX","e6",()=>A.S(A.cl(void 0)))
t($,"hY","e7",()=>A.S(function(){var $argumentsExpr$="$arguments$"
try{(void 0).$method$($argumentsExpr$)}catch(s){return s.message}}()))
t($,"hW","e5",()=>A.S(A.dr(null)))
t($,"hV","e4",()=>A.S(function(){try{null.$method$}catch(s){return s.message}}()))
t($,"i_","e9",()=>A.S(A.dr(void 0)))
t($,"hZ","e8",()=>A.S(function(){try{(void 0).$method$}catch(s){return s.message}}()))
t($,"hO","e_",()=>A.eS("^([+-]?\\d{4,6})-?(\\d\\d)-?(\\d\\d)(?:[ T](\\d\\d)(?::?(\\d\\d)(?::?(\\d\\d)(?:[.,](\\d+))?)?)?( ?[zZ]| ?([-+])(\\d\\d)(?::?(\\d\\d))?)?)?$"))
t($,"i0","ea",()=>A.dV(B.a7))})();(function nativeSupport(){!function(){var t=function(a){var n={}
n[a]=1
return Object.keys(hunkHelpers.convertToFastObject(n))[0]}
v.getIsolateTag=function(a){return t("___dart_"+a+v.isolateTag)}
var s="___dart_isolate_tags_"
var r=Object[s]||(Object[s]=Object.create(null))
var q="_ZxYxX"
for(var p=0;;p++){var o=t(q+"_"+p+"_")
if(!(o in r)){r[o]=1
v.isolateTag=o
break}}}()
hunkHelpers.setOrUpdateInterceptorsByTag({})
hunkHelpers.setOrUpdateLeafTags({})})()
Function.prototype.$2=function(a,b){return this(a,b)}
Function.prototype.$0=function(){return this()}
Function.prototype.$1=function(a){return this(a)}
Function.prototype.$3=function(a,b,c){return this(a,b,c)}
Function.prototype.$4=function(a,b,c,d){return this(a,b,c,d)}
convertAllToFastObject(w)
convertToFastObject($);(function(a){if(typeof document==="undefined"){a(null)
return}if(typeof document.currentScript!="undefined"){a(document.currentScript)
return}var t=document.scripts
function onLoad(b){for(var r=0;r<t.length;++r){t[r].removeEventListener("load",onLoad,false)}a(b.target)}for(var s=0;s<t.length;++s){t[s].addEventListener("load",onLoad,false)}})(function(a){v.currentScript=a
var t=A.hx
if(typeof dartMainRunner==="function"){dartMainRunner(t,[])}else{t([])}})})()
// The bundle above ran its main() during module evaluation and put the API
// on globalThis. Re-exported here so importers get a value rather than
// reaching for a global — and so the bundler keeps the file.
export const radarCalc = globalThis.radarCalc;
