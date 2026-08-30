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
// SOURCES_SHA256: bbc3e744bbf51f108aa9edb6f453e4ec8ecb04e021ed7f7c7efc22bf6e627c36
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
if(a[b]!==t){A.hA(b)}a[b]=s}var r=a[b]
a[c]=function(){return r}
return r}}function makeConstList(a,b){if(b!=null)A.d(a,b)
a.$flags=7
return a}function convertToFastObject(a){function t(){}t.prototype=a
new t()
return a}function convertAllToFastObject(a){for(var t=0;t<a.length;++t){convertToFastObject(a[t])}}var y=0
function instanceTearOffGetter(a,b){var t=null
return a?function(c){if(t===null)t=A.cT(b)
return new t(c,this)}:function(){if(t===null)t=A.cT(b)
return new t(this,null)}}function staticTearOffGetter(a){var t=null
return function(){if(t===null)t=A.cT(a).prototype
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
et(a,b){var t=A.d(a,b.i("e<0>"))
t.$flags=1
return t},
eu(a,b){return J.e8(a,b)},
d7(a){if(a<256)switch(a){case 9:case 10:case 11:case 12:case 13:case 32:case 133:case 160:return!0
default:return!1}switch(a){case 5760:case 8192:case 8193:case 8194:case 8195:case 8196:case 8197:case 8198:case 8199:case 8200:case 8201:case 8202:case 8232:case 8233:case 8239:case 8287:case 12288:case 65279:return!0
default:return!1}},
ev(a,b){var t,s
for(t=a.length;b<t;){s=a.charCodeAt(b)
if(s!==32&&s!==13&&!J.d7(s))break;++b}return b},
ew(a,b){var t,s
for(;b>0;b=t){t=b-1
s=a.charCodeAt(t)
if(s!==32&&s!==13&&!J.d7(s))break}return b},
ah(a){if(typeof a=="number"){if(Math.floor(a)==a)return J.aC.prototype
return J.bb.prototype}if(typeof a=="string")return J.a6.prototype
if(a==null)return J.aD.prototype
if(typeof a=="boolean")return J.ba.prototype
if(Array.isArray(a))return J.e.prototype
if(typeof a=="function")return J.aE.prototype
if(typeof a=="object"){if(a instanceof A.c){return a}else{return J.aq.prototype}}if(!(a instanceof A.c))return J.a0.prototype
return a},
dN(a){if(a==null)return a
if(Array.isArray(a))return J.e.prototype
if(!(a instanceof A.c))return J.a0.prototype
return a},
hj(a){if(typeof a=="string")return J.a6.prototype
if(a==null)return a
if(Array.isArray(a))return J.e.prototype
if(!(a instanceof A.c))return J.a0.prototype
return a},
hk(a){if(typeof a=="number")return J.ao.prototype
if(typeof a=="string")return J.a6.prototype
if(a==null)return a
if(!(a instanceof A.c))return J.a0.prototype
return a},
cD(a,b){if(a==null)return b==null
if(typeof a!="object")return b!=null&&a===b
return J.ah(a).G(a,b)},
e8(a,b){return J.hk(a).k(a,b)},
e9(a,b){return J.dN(a).E(a,b)},
bG(a){return J.ah(a).gn(a)},
cY(a){return J.dN(a).gq(a)},
ea(a){return J.hj(a).gp(a)},
eb(a){return J.ah(a).gF(a)},
aY(a){return J.ah(a).j(a)},
b8:function b8(){},
ba:function ba(){},
aD:function aD(){},
aq:function aq(){},
Y:function Y(){},
cb:function cb(){},
a0:function a0(){},
aE:function aE(){},
e:function e(a){this.$ti=a},
b9:function b9(){},
bV:function bV(a){this.$ti=a},
ak:function ak(a,b,c){var _=this
_.a=a
_.b=b
_.c=0
_.d=null
_.$ti=c},
ao:function ao(){},
aC:function aC(){},
bb:function bb(){},
a6:function a6(){}},A={cG:function cG(){},
dl(a,b){a=a+b&536870911
a=a+((a&524287)<<10)&536870911
return a^a>>>6},
eQ(a){a=a+((a&67108863)<<3)&536870911
a^=a>>>11
return a+((a&16383)<<15)&536870911},
cU(a){var t,s
for(t=$.af.length,s=0;s<t;++s)if(a===$.af[s])return!0
return!1},
eF(a,b,c,d){if(u.Q.b(a))return new A.aA(a,b,c.i("@<0>").M(d).i("aA<1,2>"))
return new A.a8(a,b,c.i("@<0>").M(d).i("a8<1,2>"))},
cF(){return new A.bq("No element")},
bf:function bf(a){this.a=a},
cd:function cd(){},
k:function k(){},
m:function m(){},
bi:function bi(a,b,c){var _=this
_.a=a
_.b=b
_.c=0
_.d=null
_.$ti=c},
a8:function a8(a,b,c){this.a=a
this.b=b
this.$ti=c},
aA:function aA(a,b,c){this.a=a
this.b=b
this.$ti=c},
bj:function bj(a,b,c){var _=this
_.a=null
_.b=a
_.c=b
_.$ti=c},
i:function i(a,b,c){this.a=a
this.b=b
this.$ti=c},
dU(a){var t=v.mangledGlobalNames[a]
if(t!=null)return t
return"minified:"+a},
j(a){var t
if(typeof a=="string")return a
if(typeof a=="number"){if(a!==0)return""+a}else if(!0===a)return"true"
else if(!1===a)return"false"
else if(a==null)return"null"
t=J.aY(a)
return t},
bm(a){var t,s=$.dc
if(s==null)s=$.dc=Symbol("identityHashCode")
t=a[s]
if(t==null){t=Math.random()*0x3fffffff|0
a[s]=t}return t},
eK(a,b){var t,s=/^\s*[+-]?((0x[a-f0-9]+)|(\d+)|([a-z0-9]+))\s*$/i.exec(a)
if(s==null)return null
t=s[3]
if(t!=null)return parseInt(a,10)
if(s[2]!=null)return parseInt(a,16)
return null},
bn(a){var t,s,r,q
if(a instanceof A.c)return A.y(A.bD(a),null)
t=J.ah(a)
if(t===B.J||t===B.K||u.B.b(a)){s=B.t(a)
if(s!=="Object"&&s!=="")return s
r=a.constructor
if(typeof r=="function"){q=r.name
if(typeof q=="string"&&q!=="Object"&&q!=="")return q}}return A.y(A.bD(a),null)},
eL(a){var t,s,r
if(typeof a=="number"||A.cR(a))return J.aY(a)
if(typeof a=="string")return JSON.stringify(a)
if(a instanceof A.a4)return a.j(0)
t=$.e7()
for(s=0;s<1;++s){r=t[s].aF(a)
if(r!=null)return r}return"Instance of '"+A.bn(a)+"'"},
p(a){var t
if(a<=65535)return String.fromCharCode(a)
if(a<=1114111){t=a-65536
return String.fromCharCode((B.a.a7(t,10)|55296)>>>0,t&1023|56320)}throw A.b(A.aJ(a,0,1114111,null,null))},
dh(a,b,c,d,e,f,g,h,i){var t,s,r,q=b-1
if(0<=a&&a<100){a+=400
q-=4800}t=B.a.K(h,1000)
g+=B.a.t(h-t,1000)
s=i?Date.UTC(a,q,c,d,e,f,g):new Date(a,q,c,d,e,f,g).valueOf()
r=!0
if(!isNaN(s))if(!(s<-864e13))if(!(s>864e13))r=s===864e13&&t!==0
if(r)return null
return s},
t(a){if(a.date===void 0)a.date=new Date(a.a)
return a.date},
H(a){return a.c?A.t(a).getUTCFullYear()+0:A.t(a).getFullYear()+0},
Q(a){return a.c?A.t(a).getUTCMonth()+1:A.t(a).getMonth()+1},
ar(a){return a.c?A.t(a).getUTCDate()+0:A.t(a).getDate()+0},
dd(a){return a.c?A.t(a).getUTCHours()+0:A.t(a).getHours()+0},
df(a){return a.c?A.t(a).getUTCMinutes()+0:A.t(a).getMinutes()+0},
dg(a){return a.c?A.t(a).getUTCSeconds()+0:A.t(a).getSeconds()+0},
de(a){return a.c?A.t(a).getUTCMilliseconds()+0:A.t(a).getMilliseconds()+0},
cJ(a){return B.a.K((a.c?A.t(a).getUTCDay()+0:A.t(a).getDay()+0)+6,7)+1},
fW(a){return new A.V(!0,a,null,null)},
b(a){return A.q(a,new Error())},
q(a,b){var t
if(a==null)a=new A.aO()
b.dartException=a
t=A.hC
if("defineProperty" in Object){Object.defineProperty(b,"message",{get:t})
b.name=""}else b.toString=t
return b},
hC(){return J.aY(this.dartException)},
bF(a,b){throw A.q(a,b==null?new Error():b)},
hB(a,b,c){var t
if(b==null)b=0
if(c==null)c=0
t=Error()
A.bF(A.fn(a,b,c),t)},
fn(a,b,c){var t,s,r,q,p,o,n,m,l
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
return new A.aP("'"+t+"': Cannot "+p+" "+m+l+o)},
r(a){throw A.b(A.W(a))},
S(a){var t,s,r,q,p,o
a=A.ht(a.replace(String({}),"$receiver$"))
t=a.match(/\\\$[a-zA-Z]+\\\$/g)
if(t==null)t=A.d([],u.s)
s=t.indexOf("\\$arguments\\$")
r=t.indexOf("\\$argumentsExpr\\$")
q=t.indexOf("\\$expr\\$")
p=t.indexOf("\\$method\\$")
o=t.indexOf("\\$receiver\\$")
return new A.ci(a.replace(new RegExp("\\\\\\$arguments\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$argumentsExpr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$expr\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$method\\\\\\$","g"),"((?:x|[^x])*)").replace(new RegExp("\\\\\\$receiver\\\\\\$","g"),"((?:x|[^x])*)"),s,r,q,p,o)},
cj(a){return function($expr$){var $argumentsExpr$="$arguments$"
try{$expr$.$method$($argumentsExpr$)}catch(t){return t.message}}(a)},
dm(a){return function($expr$){try{$expr$.$method$}catch(t){return t.message}}(a)},
cH(a,b){var t=b==null,s=t?null:b.method
return new A.bd(a,s,t?null:b.receiver)},
cW(a){if(a==null)return new A.ca(a)
if(typeof a!=="object")return a
if("dartException" in a)return A.aj(a,a.dartException)
return A.fT(a)},
aj(a,b){if(u.C.b(b))if(b.$thrownJsError==null)b.$thrownJsError=a
return b},
fT(a){var t,s,r,q,p,o,n,m,l,k,j,i,h
if(!("message" in a))return a
t=a.message
if("number" in a&&typeof a.number=="number"){s=a.number
r=s&65535
if((B.a.a7(s,16)&8191)===10)switch(r){case 438:return A.aj(a,A.cH(A.j(t)+" (Error "+r+")",null))
case 445:case 5007:A.j(t)
return A.aj(a,new A.aH())}}if(a instanceof TypeError){q=$.dX()
p=$.dY()
o=$.dZ()
n=$.e_()
m=$.e2()
l=$.e3()
k=$.e1()
$.e0()
j=$.e5()
i=$.e4()
h=q.C(t)
if(h!=null)return A.aj(a,A.cH(t,h))
else{h=p.C(t)
if(h!=null){h.method="call"
return A.aj(a,A.cH(t,h))}else if(o.C(t)!=null||n.C(t)!=null||m.C(t)!=null||l.C(t)!=null||k.C(t)!=null||n.C(t)!=null||j.C(t)!=null||i.C(t)!=null)return A.aj(a,new A.aH())}return A.aj(a,new A.bu(typeof t=="string"?t:""))}if(a instanceof RangeError){if(typeof t=="string"&&t.indexOf("call stack")!==-1)return new A.aL()
t=function(b){try{return String(b)}catch(g){}return null}(a)
return A.aj(a,new A.V(!1,null,null,typeof t=="string"?t.replace(/^RangeError:\s*/,""):t))}if(typeof InternalError=="function"&&a instanceof InternalError)if(typeof t=="string"&&t==="too much recursion")return new A.aL()
return a},
dR(a){if(a==null)return J.bG(a)
if(typeof a=="object")return A.bm(a)
return J.bG(a)},
hi(a,b){var t,s,r,q=a.length
for(t=0;t<q;t=r){s=t+1
r=s+1
b.B(0,a[t],a[s])}return b},
fw(a,b,c,d,e,f){switch(b){case 0:return a.$0()
case 1:return a.$1(c)
case 2:return a.$2(c,d)
case 3:return a.$3(c,d,e)
case 4:return a.$4(c,d,e,f)}throw A.b(new A.cl("Unsupported number of arguments for wrapped closure"))},
hb(a,b){var t=a.$identity
if(!!t)return t
t=A.hc(a,b)
a.$identity=t
return t},
hc(a,b){var t
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
return function(c,d,e){return function(f,g,h,i){return e(c,d,f,g,h,i)}}(a,b,A.fw)},
ek(a1){var t,s,r,q,p,o,n,m,l,k,j=a1.co,i=a1.iS,h=a1.iI,g=a1.nDA,f=a1.aI,e=a1.fs,d=a1.cs,c=e[0],b=d[0],a=j[c],a0=a1.fT
a0.toString
t=i?Object.create(new A.cf().constructor.prototype):Object.create(new A.ay(null,null).constructor.prototype)
t.$initialize=t.constructor
s=i?function static_tear_off(){this.$initialize()}:function tear_off(a2,a3){this.$initialize(a2,a3)}
t.constructor=s
s.prototype=t
t.$_name=c
t.$_target=a
r=!i
if(r)q=A.d2(c,a,h,g)
else{t.$static_name=c
q=a}t.$S=A.eg(a0,i,h)
t[b]=q
for(p=q,o=1;o<e.length;++o){n=e[o]
if(typeof n=="string"){m=j[n]
l=n
n=m}else l=""
k=d[o]
if(k!=null){if(r)n=A.d2(l,n,h,g)
t[k]=n}if(o===f)p=n}t.$C=p
t.$R=a1.rC
t.$D=a1.dV
return s},
eg(a,b,c){if(typeof a=="number")return a
if(typeof a=="string"){if(b)throw A.b("Cannot compute signature for static tearoff.")
return function(d,e){return function(){return e(this,d)}}(a,A.ed)}throw A.b("Error in functionType of tearoff")},
eh(a,b,c,d){var t=A.d1
switch(b?-1:a){case 0:return function(e,f){return function(){return f(this)[e]()}}(c,t)
case 1:return function(e,f){return function(g){return f(this)[e](g)}}(c,t)
case 2:return function(e,f){return function(g,h){return f(this)[e](g,h)}}(c,t)
case 3:return function(e,f){return function(g,h,i){return f(this)[e](g,h,i)}}(c,t)
case 4:return function(e,f){return function(g,h,i,j){return f(this)[e](g,h,i,j)}}(c,t)
case 5:return function(e,f){return function(g,h,i,j,k){return f(this)[e](g,h,i,j,k)}}(c,t)
default:return function(e,f){return function(){return e.apply(f(this),arguments)}}(d,t)}},
d2(a,b,c,d){if(c)return A.ej(a,b,d)
return A.eh(b.length,d,a,b)},
ei(a,b,c,d){var t=A.d1,s=A.ee
switch(b?-1:a){case 0:throw A.b(new A.bp("Intercepted function with no arguments."))
case 1:return function(e,f,g){return function(){return f(this)[e](g(this))}}(c,s,t)
case 2:return function(e,f,g){return function(h){return f(this)[e](g(this),h)}}(c,s,t)
case 3:return function(e,f,g){return function(h,i){return f(this)[e](g(this),h,i)}}(c,s,t)
case 4:return function(e,f,g){return function(h,i,j){return f(this)[e](g(this),h,i,j)}}(c,s,t)
case 5:return function(e,f,g){return function(h,i,j,k){return f(this)[e](g(this),h,i,j,k)}}(c,s,t)
case 6:return function(e,f,g){return function(h,i,j,k,l){return f(this)[e](g(this),h,i,j,k,l)}}(c,s,t)
default:return function(e,f,g){return function(){var r=[g(this)]
Array.prototype.push.apply(r,arguments)
return e.apply(f(this),r)}}(d,s,t)}},
ej(a,b,c){var t,s
if($.d_==null)$.d_=A.cZ("interceptor")
if($.d0==null)$.d0=A.cZ("receiver")
t=b.length
s=A.ei(t,c,a,b)
return s},
cT(a){return A.ek(a)},
ed(a,b){return A.ct(v.typeUniverse,A.bD(a.a),b)},
d1(a){return a.a},
ee(a){return a.b},
cZ(a){var t,s,r,q=new A.ay("receiver","interceptor"),p=Object.getOwnPropertyNames(q)
p.$flags=1
t=p
for(p=t.length,s=0;s<p;++s){r=t[s]
if(q[r]===a)return r}throw A.b(A.cE("Field name "+a+" not found."))},
dO(a){return v.getIsolateTag(a)},
he(a,b){var t=b.length,s=v.rttc[""+t+";"+a]
if(s==null)return null
if(t===0)return s
if(t===s.length)return s.apply(null,b)
return s(b)},
ex(a,b,c,d,e,f){var t=function(g,h){try{return new RegExp(g,h)}catch(s){return s}}(a,""+""+""+""+f)
if(t instanceof RegExp)return t
throw A.b(A.b6("Illegal RegExp pattern ("+String(t)+")",a))},
ht(a){if(/[[\]{}()*+?.\\^$|]/.test(a))return a.replace(/[[\]{}()*+?.\\^$|]/g,"\\$&")
return a},
aK:function aK(){},
ci:function ci(a,b,c,d,e,f){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f},
aH:function aH(){},
bd:function bd(a,b,c){this.a=a
this.b=b
this.c=c},
bu:function bu(a){this.a=a},
ca:function ca(a){this.a=a},
a4:function a4(){},
bH:function bH(){},
bI:function bI(){},
cg:function cg(){},
cf:function cf(){},
ay:function ay(a,b){this.a=a
this.b=b},
bp:function bp(a){this.a=a},
L:function L(a){var _=this
_.a=0
_.f=_.e=_.d=_.c=_.b=null
_.r=0
_.$ti=a},
c7:function c7(a,b){this.a=a
this.b=b
this.c=null},
N:function N(a,b){this.a=a
this.$ti=b},
bh:function bh(a,b,c){var _=this
_.a=a
_.b=b
_.c=c
_.d=null},
M:function M(a,b){this.a=a
this.$ti=b},
bg:function bg(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=null
_.$ti=d},
bU:function bU(a,b){this.a=a
this.b=b},
cq:function cq(a){this.b=a},
cL(a,b){var t=b.c
return t==null?b.c=A.aU(a,"d5",[b.x]):t},
di(a){var t=a.w
if(t===6||t===7)return A.di(a.x)
return t===11||t===12},
eP(a){return a.as},
a3(a){return A.cs(v.typeUniverse,a,!1)},
ae(a0,a1,a2,a3){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a=a1.w
switch(a){case 5:case 1:case 2:case 3:case 4:return a1
case 6:t=a1.x
s=A.ae(a0,t,a2,a3)
if(s===t)return a1
return A.dw(a0,s,!0)
case 7:t=a1.x
s=A.ae(a0,t,a2,a3)
if(s===t)return a1
return A.dv(a0,s,!0)
case 8:r=a1.y
q=A.av(a0,r,a2,a3)
if(q===r)return a1
return A.aU(a0,a1.x,q)
case 9:p=a1.x
o=A.ae(a0,p,a2,a3)
n=a1.y
m=A.av(a0,n,a2,a3)
if(o===p&&m===n)return a1
return A.cO(a0,o,m)
case 10:l=a1.x
k=a1.y
j=A.av(a0,k,a2,a3)
if(j===k)return a1
return A.dx(a0,l,j)
case 11:i=a1.x
h=A.ae(a0,i,a2,a3)
g=a1.y
f=A.fQ(a0,g,a2,a3)
if(h===i&&f===g)return a1
return A.du(a0,h,f)
case 12:e=a1.y
a3+=e.length
d=A.av(a0,e,a2,a3)
p=a1.x
o=A.ae(a0,p,a2,a3)
if(d===e&&o===p)return a1
return A.cP(a0,o,d,!0)
case 13:c=a1.x
if(c<a3)return a1
b=a2[c-a3]
if(b==null)return a1
return b
default:throw A.b(A.b_("Attempted to substitute unexpected RTI kind "+a))}},
av(a,b,c,d){var t,s,r,q,p=b.length,o=A.cu(p)
for(t=!1,s=0;s<p;++s){r=b[s]
q=A.ae(a,r,c,d)
if(q!==r)t=!0
o[s]=q}return t?o:b},
fR(a,b,c,d){var t,s,r,q,p,o,n=b.length,m=A.cu(n)
for(t=!1,s=0;s<n;s+=3){r=b[s]
q=b[s+1]
p=b[s+2]
o=A.ae(a,p,c,d)
if(o!==p)t=!0
m.splice(s,3,r,q,o)}return t?m:b},
fQ(a,b,c,d){var t,s=b.a,r=A.av(a,s,c,d),q=b.b,p=A.av(a,q,c,d),o=b.c,n=A.fR(a,o,c,d)
if(r===s&&p===q&&n===o)return b
t=new A.bx()
t.a=r
t.b=p
t.c=n
return t},
d(a,b){a[v.arrayRti]=b
return a},
dM(a){var t=a.$S
if(t!=null){if(typeof t=="number")return A.hm(t)
return a.$S()}return null},
ho(a,b){var t
if(A.di(b))if(a instanceof A.a4){t=A.dM(a)
if(t!=null)return t}return A.bD(a)},
bD(a){if(a instanceof A.c)return A.x(a)
if(Array.isArray(a))return A.v(a)
return A.cQ(J.ah(a))},
v(a){var t=a[v.arrayRti],s=u.b
if(t==null)return s
if(t.constructor!==s.constructor)return s
return t},
x(a){var t=a.$ti
return t!=null?t:A.cQ(a)},
cQ(a){var t=a.constructor,s=t.$ccache
if(s!=null)return s
return A.fu(a,t)},
fu(a,b){var t=a instanceof A.a4?Object.getPrototypeOf(Object.getPrototypeOf(a)).constructor:b,s=A.f7(v.typeUniverse,t.name)
b.$ccache=s
return s},
hm(a){var t,s=v.types,r=s[a]
if(typeof r=="string"){t=A.cs(v.typeUniverse,r,!1)
s[a]=t
return t}return r},
hl(a){return A.ag(A.x(a))},
fP(a){var t=a instanceof A.a4?A.dM(a):null
if(t!=null)return t
if(u.l.b(a))return J.eb(a).a
if(Array.isArray(a))return A.v(a)
return A.bD(a)},
ag(a){var t=a.r
return t==null?a.r=new A.cr(a):t},
hE(a){return A.ag(A.cs(v.typeUniverse,a,!1))},
ft(a){var t=this
t.b=A.fO(t)
return t.b(a)},
fO(a){var t,s,r,q
if(a===u.K)return A.fD
if(A.ai(a))return A.fH
t=a.w
if(t===6)return A.fr
if(t===1)return A.dG
if(t===7)return A.fx
s=A.fN(a)
if(s!=null)return s
if(t===8){r=a.x
if(a.y.every(A.ai)){a.f="$i"+r
if(r==="Z")return A.fB
if(a===u.m)return A.fA
return A.fG}}else if(t===10){q=A.he(a.x,a.y)
return q==null?A.dG:q}return A.fp},
fN(a){if(a.w===8){if(a===u.S)return A.fy
if(a===u.i||a===u.H)return A.fC
if(a===u.N)return A.fF
if(a===u.y)return A.cR}return null},
fs(a){var t=this,s=A.fo
if(A.ai(t))s=A.fj
else if(t===u.K)s=A.fi
else if(A.aw(t)){s=A.fq
if(t===u.E)s=A.fe
else if(t===u.v)s=A.a2
else if(t===u.u)s=A.fa
else if(t===u.F)s=A.bA
else if(t===u.w)s=A.fc
else if(t===u.D)s=A.fg}else if(t===u.S)s=A.fd
else if(t===u.N)s=A.dA
else if(t===u.y)s=A.f9
else if(t===u.H)s=A.fh
else if(t===u.i)s=A.fb
else if(t===u.m)s=A.ff
t.a=s
return t.a(a)},
fp(a){var t=this
if(a==null)return A.aw(t)
return A.hp(v.typeUniverse,A.ho(a,t),t)},
fr(a){if(a==null)return!0
return this.x.b(a)},
fG(a){var t,s=this
if(a==null)return A.aw(s)
t=s.f
if(a instanceof A.c)return!!a[t]
return!!J.ah(a)[t]},
fB(a){var t,s=this
if(a==null)return A.aw(s)
if(typeof a!="object")return!1
if(Array.isArray(a))return!0
t=s.f
if(a instanceof A.c)return!!a[t]
return!!J.ah(a)[t]},
fA(a){var t=this
if(a==null)return!1
if(typeof a=="object"){if(a instanceof A.c)return!!a[t.f]
return!0}if(typeof a=="function")return!0
return!1},
dF(a){if(typeof a=="object"){if(a instanceof A.c)return u.m.b(a)
return!0}if(typeof a=="function")return!0
return!1},
fo(a){var t=this
if(a==null){if(A.aw(t))return a}else if(t.b(a))return a
throw A.q(A.dB(a,t),new Error())},
fq(a){var t=this
if(a==null||t.b(a))return a
throw A.q(A.dB(a,t),new Error())},
dB(a,b){return new A.aS("TypeError: "+A.dn(a,A.y(b,null)))},
dn(a,b){return A.b4(a)+": type '"+A.y(A.fP(a),null)+"' is not a subtype of type '"+b+"'"},
C(a,b){return new A.aS("TypeError: "+A.dn(a,b))},
fx(a){var t=this
return t.x.b(a)||A.cL(v.typeUniverse,t).b(a)},
fD(a){return a!=null},
fi(a){if(a!=null)return a
throw A.q(A.C(a,"Object"),new Error())},
fH(a){return!0},
fj(a){return a},
dG(a){return!1},
cR(a){return!0===a||!1===a},
f9(a){if(!0===a)return!0
if(!1===a)return!1
throw A.q(A.C(a,"bool"),new Error())},
fa(a){if(!0===a)return!0
if(!1===a)return!1
if(a==null)return a
throw A.q(A.C(a,"bool?"),new Error())},
fb(a){if(typeof a=="number")return a
throw A.q(A.C(a,"double"),new Error())},
fc(a){if(typeof a=="number")return a
if(a==null)return a
throw A.q(A.C(a,"double?"),new Error())},
fy(a){return typeof a=="number"&&Math.floor(a)===a},
fd(a){if(typeof a=="number"&&Math.floor(a)===a)return a
throw A.q(A.C(a,"int"),new Error())},
fe(a){if(typeof a=="number"&&Math.floor(a)===a)return a
if(a==null)return a
throw A.q(A.C(a,"int?"),new Error())},
fC(a){return typeof a=="number"},
fh(a){if(typeof a=="number")return a
throw A.q(A.C(a,"num"),new Error())},
bA(a){if(typeof a=="number")return a
if(a==null)return a
throw A.q(A.C(a,"num?"),new Error())},
fF(a){return typeof a=="string"},
dA(a){if(typeof a=="string")return a
throw A.q(A.C(a,"String"),new Error())},
a2(a){if(typeof a=="string")return a
if(a==null)return a
throw A.q(A.C(a,"String?"),new Error())},
ff(a){if(A.dF(a))return a
throw A.q(A.C(a,"JSObject"),new Error())},
fg(a){if(a==null)return a
if(A.dF(a))return a
throw A.q(A.C(a,"JSObject?"),new Error())},
dI(a,b){var t,s,r
for(t="",s="",r=0;r<a.length;++r,s=", ")t+=s+A.y(a[r],b)
return t},
fM(a,b){var t,s,r,q,p,o,n=a.x,m=a.y
if(""===n)return"("+A.dI(m,b)+")"
t=m.length
s=n.split(",")
r=s.length-t
for(q="(",p="",o=0;o<t;++o,p=", "){q+=p
if(r===0)q+="{"
q+=A.y(m[o],b)
if(r>=0)q+=" "+s[r];++r}return q+"})"},
dD(a0,a1,a2){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b=", ",a=null
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
if(n===8){q=A.fS(a.x)
p=a.y
return p.length>0?q+("<"+A.dI(p,b)+">"):q}if(n===10)return A.fM(a,b)
if(n===11)return A.dD(a,b,null)
if(n===12)return A.dD(a.x,b,a.y)
if(n===13){o=a.x
return b[b.length-1-o]}return"?"},
fS(a){var t=v.mangledGlobalNames[a]
if(t!=null)return t
return"minified:"+a},
f8(a,b){var t=a.tR[b]
while(typeof t=="string")t=a.tR[t]
return t},
f7(a,b){var t,s,r,q,p,o=a.eT,n=o[b]
if(n==null)return A.cs(a,b,!1)
else if(typeof n=="number"){t=n
s=A.aV(a,5,"#")
r=A.cu(t)
for(q=0;q<t;++q)r[q]=s
p=A.aU(a,b,r)
o[b]=p
return p}else return n},
f5(a,b){return A.dy(a.tR,b)},
f4(a,b){return A.dy(a.eT,b)},
cs(a,b,c){var t,s=a.eC,r=s.get(b)
if(r!=null)return r
t=A.ds(A.dq(a,null,b,!1))
s.set(b,t)
return t},
ct(a,b,c){var t,s,r=b.z
if(r==null)r=b.z=new Map()
t=r.get(c)
if(t!=null)return t
s=A.ds(A.dq(a,b,c,!0))
r.set(c,s)
return s},
f6(a,b,c){var t,s,r,q=b.Q
if(q==null)q=b.Q=new Map()
t=c.as
s=q.get(t)
if(s!=null)return s
r=A.cO(a,b,c.w===9?c.y:[c])
q.set(t,r)
return r},
a1(a,b){b.a=A.fs
b.b=A.ft
return b},
aV(a,b,c){var t,s,r=a.eC.get(c)
if(r!=null)return r
t=new A.F(null,null)
t.w=b
t.as=c
s=A.a1(a,t)
a.eC.set(c,s)
return s},
dw(a,b,c){var t,s=b.as+"?",r=a.eC.get(s)
if(r!=null)return r
t=A.f2(a,b,s,c)
a.eC.set(s,t)
return t},
f2(a,b,c,d){var t,s,r
if(d){t=b.w
s=!0
if(!A.ai(b))if(!(b===u.a||b===u.T))if(t!==6)s=t===7&&A.aw(b.x)
if(s)return b
else if(t===1)return u.a}r=new A.F(null,null)
r.w=6
r.x=b
r.as=c
return A.a1(a,r)},
dv(a,b,c){var t,s=b.as+"/",r=a.eC.get(s)
if(r!=null)return r
t=A.f0(a,b,s,c)
a.eC.set(s,t)
return t},
f0(a,b,c,d){var t,s
if(d){t=b.w
if(A.ai(b)||b===u.K)return b
else if(t===1)return A.aU(a,"d5",[b])
else if(b===u.a||b===u.T)return u.c}s=new A.F(null,null)
s.w=7
s.x=b
s.as=c
return A.a1(a,s)},
f3(a,b){var t,s,r=""+b+"^",q=a.eC.get(r)
if(q!=null)return q
t=new A.F(null,null)
t.w=13
t.x=b
t.as=r
s=A.a1(a,t)
a.eC.set(r,s)
return s},
aT(a){var t,s,r,q=a.length
for(t="",s="",r=0;r<q;++r,s=",")t+=s+a[r].as
return t},
f_(a){var t,s,r,q,p,o=a.length
for(t="",s="",r=0;r<o;r+=3,s=","){q=a[r]
p=a[r+1]?"!":":"
t+=s+q+p+a[r+2].as}return t},
aU(a,b,c){var t,s,r,q=b
if(c.length>0)q+="<"+A.aT(c)+">"
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
cO(a,b,c){var t,s,r,q,p,o
if(b.w===9){t=b.x
s=b.y.concat(c)}else{s=c
t=b}r=t.as+(";<"+A.aT(s)+">")
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
dx(a,b,c){var t,s,r="+"+(b+"("+A.aT(c)+")"),q=a.eC.get(r)
if(q!=null)return q
t=new A.F(null,null)
t.w=10
t.x=b
t.y=c
t.as=r
s=A.a1(a,t)
a.eC.set(r,s)
return s},
du(a,b,c){var t,s,r,q,p,o=b.as,n=c.a,m=n.length,l=c.b,k=l.length,j=c.c,i=j.length,h="("+A.aT(n)
if(k>0){t=m>0?",":""
h+=t+"["+A.aT(l)+"]"}if(i>0){t=m>0?",":""
h+=t+"{"+A.f_(j)+"}"}s=o+(h+")")
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
cP(a,b,c,d){var t,s=b.as+("<"+A.aT(c)+">"),r=a.eC.get(s)
if(r!=null)return r
t=A.f1(a,b,c,s,d)
a.eC.set(s,t)
return t},
f1(a,b,c,d,e){var t,s,r,q,p,o,n,m
if(e){t=c.length
s=A.cu(t)
for(r=0,q=0;q<t;++q){p=c[q]
if(p.w===1){s[q]=p;++r}}if(r>0){o=A.ae(a,b,s,0)
n=A.av(a,c,s,0)
return A.cP(a,o,n,c!==n)}}m=new A.F(null,null)
m.w=12
m.x=b
m.y=c
m.as=d
return A.a1(a,m)},
dq(a,b,c,d){return{u:a,e:b,r:c,s:[],p:0,n:d}},
ds(a){var t,s,r,q,p,o,n,m=a.r,l=a.s
for(t=m.length,s=0;s<t;){r=m.charCodeAt(s)
if(r>=48&&r<=57)s=A.eV(s+1,r,m,l)
else if((((r|32)>>>0)-97&65535)<26||r===95||r===36||r===124)s=A.dr(a,s,m,l,!1)
else if(r===46)s=A.dr(a,s,m,l,!0)
else{++s
switch(r){case 44:break
case 58:l.push(!1)
break
case 33:l.push(!0)
break
case 59:l.push(A.ad(a.u,a.e,l.pop()))
break
case 94:l.push(A.f3(a.u,l.pop()))
break
case 35:l.push(A.aV(a.u,5,"#"))
break
case 64:l.push(A.aV(a.u,2,"@"))
break
case 126:l.push(A.aV(a.u,3,"~"))
break
case 60:l.push(a.p)
a.p=l.length
break
case 62:A.eX(a,l)
break
case 38:A.eW(a,l)
break
case 63:q=a.u
l.push(A.dw(q,A.ad(q,a.e,l.pop()),a.n))
break
case 47:q=a.u
l.push(A.dv(q,A.ad(q,a.e,l.pop()),a.n))
break
case 40:l.push(-3)
l.push(a.p)
a.p=l.length
break
case 41:A.eU(a,l)
break
case 91:l.push(a.p)
a.p=l.length
break
case 93:p=l.splice(a.p)
A.dt(a.u,a.e,p)
a.p=l.pop()
l.push(p)
l.push(-1)
break
case 123:l.push(a.p)
a.p=l.length
break
case 125:p=l.splice(a.p)
A.eZ(a.u,a.e,p)
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
eV(a,b,c,d){var t,s,r=b-48
for(t=c.length;a<t;++a){s=c.charCodeAt(a)
if(!(s>=48&&s<=57))break
r=r*10+(s-48)}d.push(r)
return a},
dr(a,b,c,d,e){var t,s,r,q,p,o,n=b+1
for(t=c.length;n<t;++n){s=c.charCodeAt(n)
if(s===46){if(e)break
e=!0}else{if(!((((s|32)>>>0)-97&65535)<26||s===95||s===36||s===124))r=s>=48&&s<=57
else r=!0
if(!r)break}}q=c.substring(b,n)
if(e){t=a.u
p=a.e
if(p.w===9)p=p.x
o=A.f8(t,p.x)[q]
if(o==null)A.bF('No "'+q+'" in "'+A.eP(p)+'"')
d.push(A.ct(t,p,o))}else d.push(q)
return n},
eX(a,b){var t,s=a.u,r=A.dp(a,b),q=b.pop()
if(typeof q=="string")b.push(A.aU(s,q,r))
else{t=A.ad(s,a.e,q)
switch(t.w){case 11:b.push(A.cP(s,t,r,a.n))
break
default:b.push(A.cO(s,t,r))
break}}},
eU(a,b){var t,s,r,q=a.u,p=b.pop(),o=null,n=null
if(typeof p=="number")switch(p){case-1:o=b.pop()
break
case-2:n=b.pop()
break
default:b.push(p)
break}else b.push(p)
t=A.dp(a,b)
p=b.pop()
switch(p){case-3:p=b.pop()
if(o==null)o=q.sEA
if(n==null)n=q.sEA
s=A.ad(q,a.e,p)
r=new A.bx()
r.a=t
r.b=o
r.c=n
b.push(A.du(q,s,r))
return
case-4:b.push(A.dx(q,b.pop(),t))
return
default:throw A.b(A.b_("Unexpected state under `()`: "+A.j(p)))}},
eW(a,b){var t=b.pop()
if(0===t){b.push(A.aV(a.u,1,"0&"))
return}if(1===t){b.push(A.aV(a.u,4,"1&"))
return}throw A.b(A.b_("Unexpected extended operation "+A.j(t)))},
dp(a,b){var t=b.splice(a.p)
A.dt(a.u,a.e,t)
a.p=b.pop()
return t},
ad(a,b,c){if(typeof c=="string")return A.aU(a,c,a.sEA)
else if(typeof c=="number"){b.toString
return A.eY(a,b,c)}else return c},
dt(a,b,c){var t,s=c.length
for(t=0;t<s;++t)c[t]=A.ad(a,b,c[t])},
eZ(a,b,c){var t,s=c.length
for(t=2;t<s;t+=3)c[t]=A.ad(a,b,c[t])},
eY(a,b,c){var t,s,r=b.w
if(r===9){if(c===0)return b.x
t=b.y
s=t.length
if(c<=s)return t[c-1]
c-=s
b=b.x
r=b.w}else if(c===0)return b
if(r!==8)throw A.b(A.b_("Indexed base must be an interface type"))
t=b.y
if(c<=t.length)return t[c-1]
throw A.b(A.b_("Bad index "+c+" for "+b.j(0)))},
hp(a,b,c){var t,s=b.d
if(s==null)s=b.d=new Map()
t=s.get(c)
if(t==null){t=A.n(a,b,null,c,null)
s.set(c,t)}return t},
n(a,b,c,d,e){var t,s,r,q,p,o,n,m,l,k,j
if(b===d)return!0
if(A.ai(d))return!0
t=b.w
if(t===4)return!0
if(A.ai(b))return!1
if(b.w===1)return!0
s=t===13
if(s)if(A.n(a,c[b.x],c,d,e))return!0
r=d.w
q=u.a
if(b===q||b===u.T){if(r===7)return A.n(a,b,c,d.x,e)
return d===q||d===u.T||r===6}if(d===u.K){if(t===7)return A.n(a,b.x,c,d,e)
return t!==6}if(t===7){if(!A.n(a,b.x,c,d,e))return!1
return A.n(a,A.cL(a,b),c,d,e)}if(t===6)return A.n(a,q,c,d,e)&&A.n(a,b.x,c,d,e)
if(r===7){if(A.n(a,b,c,d.x,e))return!0
return A.n(a,b,c,A.cL(a,d),e)}if(r===6)return A.n(a,b,c,q,e)||A.n(a,b,c,d.x,e)
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
if(!A.n(a,k,c,j,e)||!A.n(a,j,e,k,c))return!1}return A.dE(a,b.x,c,d.x,e)}if(r===11){if(b===u.L)return!0
if(q)return!1
return A.dE(a,b,c,d,e)}if(t===8){if(r!==8)return!1
return A.fz(a,b,c,d,e)}if(p&&r===10)return A.fE(a,b,c,d,e)
return!1},
dE(a2,a3,a4,a5,a6){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1
if(!A.n(a2,a3.x,a4,a5.x,a6))return!1
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
if(!A.n(a2,q[i],a6,h,a4))return!1}for(i=0;i<n;++i){h=m[i]
if(!A.n(a2,q[p+i],a6,h,a4))return!1}for(i=0;i<j;++i){h=m[n+i]
if(!A.n(a2,l[i],a6,h,a4))return!1}g=t.c
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
if(!A.n(a2,f[b+2],a6,h,a4))return!1
break}}while(c<e){if(g[c+1])return!1
c+=3}return!0},
fz(a,b,c,d,e){var t,s,r,q,p,o=b.x,n=d.x
while(o!==n){t=a.tR[o]
if(t==null)return!1
if(typeof t=="string"){o=t
continue}s=t[n]
if(s==null)return!1
r=s.length
q=r>0?new Array(r):v.typeUniverse.sEA
for(p=0;p<r;++p)q[p]=A.ct(a,b,s[p])
return A.dz(a,q,null,c,d.y,e)}return A.dz(a,b.y,null,c,d.y,e)},
dz(a,b,c,d,e,f){var t,s=b.length
for(t=0;t<s;++t)if(!A.n(a,b[t],d,e[t],f))return!1
return!0},
fE(a,b,c,d,e){var t,s=b.y,r=d.y,q=s.length
if(q!==r.length)return!1
if(b.x!==d.x)return!1
for(t=0;t<q;++t)if(!A.n(a,s[t],c,r[t],e))return!1
return!0},
aw(a){var t=a.w,s=!0
if(!(a===u.a||a===u.T))if(!A.ai(a))if(t!==6)s=t===7&&A.aw(a.x)
return s},
ai(a){var t=a.w
return t===2||t===3||t===4||t===5||a===u.X},
dy(a,b){var t,s,r=Object.keys(b),q=r.length
for(t=0;t<q;++t){s=r[t]
a[s]=b[s]}},
cu(a){return a>0?new Array(a):v.typeUniverse.sEA},
F:function F(a,b){var _=this
_.a=a
_.b=b
_.r=_.f=_.d=_.c=null
_.w=0
_.as=_.Q=_.z=_.y=_.x=null},
bx:function bx(){this.c=this.b=this.a=null},
cr:function cr(a){this.a=a},
bw:function bw(){},
aS:function aS(a){this.a=a},
eA(a,b){return new A.L(a.i("@<0>").M(b).i("L<1,2>"))},
o(a,b,c){return A.hi(a,new A.L(b.i("@<0>").M(c).i("L<1,2>")))},
a7(a,b){return new A.L(a.i("@<0>").M(b).i("L<1,2>"))},
eB(a){return new A.ac(a.i("ac<0>"))},
eC(a){return new A.ac(a.i("ac<0>"))},
cN(){var t=Object.create(null)
t["<non-identifier-key>"]=t
delete t["<non-identifier-key>"]
return t},
cI(a,b,c){var t=A.eA(b,c)
a.H(0,new A.c8(t,b,c))
return t},
db(a){var t,s
if(A.cU(a))return"{...}"
t=new A.aM("")
try{s={}
$.af.push(a)
t.a+="{"
s.a=!0
a.H(0,new A.c9(s,t))
t.a+="}"}finally{$.af.pop()}s=t.a
return s.charCodeAt(0)==0?s:s},
ac:function ac(a){var _=this
_.a=0
_.f=_.e=_.d=_.c=_.b=null
_.r=0
_.$ti=a},
cp:function cp(a){this.a=a
this.b=null},
au:function au(a,b,c){var _=this
_.a=a
_.b=b
_.d=_.c=null
_.$ti=c},
c8:function c8(a,b,c){this.a=a
this.b=b
this.c=c},
B:function B(){},
c9:function c9(a,b){this.a=a
this.b=b},
as:function as(){},
aR:function aR(){},
fK(a,b){var t,s,r,q=null
try{q=JSON.parse(a)}catch(s){t=A.cW(s)
r=A.b6(String(t),null)
throw A.b(r)}r=A.cv(q)
return r},
cv(a){var t
if(a==null)return null
if(typeof a!="object")return a
if(!Array.isArray(a))return new A.by(a,Object.create(null))
for(t=0;t<a.length;++t)a[t]=A.cv(a[t])
return a},
da(a,b,c){return new A.aF(a,b)},
fm(a){return a.aJ()},
eS(a,b){return new A.cm(a,[],A.hd())},
eT(a,b,c){var t,s=new A.aM(""),r=A.eS(s,b)
r.U(a)
t=s.a
return t.charCodeAt(0)==0?t:t},
by:function by(a,b){this.a=a
this.b=b
this.c=null},
bz:function bz(a){this.a=a},
b0:function b0(){},
b2:function b2(){},
aF:function aF(a,b){this.a=a
this.b=b},
be:function be(a,b){this.a=a
this.b=b},
c4:function c4(){},
c6:function c6(a){this.b=a},
c5:function c5(a){this.a=a},
cn:function cn(){},
co:function co(a,b){this.a=a
this.b=b},
cm:function cm(a,b,c){this.c=a
this.a=b
this.b=c},
bE(a){var t=A.eK(a,null)
if(t!=null)return t
throw A.b(A.b6(a,null))},
eD(a,b,c){var t
if(a>4294967295)A.bF(A.aJ(a,0,4294967295,"length",null))
t=J.et(new Array(a),c)
return t},
eE(a,b,c){var t,s,r=A.d([],c.i("e<0>"))
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s)r.push(a[s])
r.$flags=1
return r},
A(a,b){var t,s
if(Array.isArray(a))return A.d(a.slice(0),b.i("e<0>"))
t=A.d([],b.i("e<0>"))
for(s=J.cY(a);s.l();)t.push(s.gm())
return t},
G(a,b){var t=A.eE(a,!1,b)
t.$flags=3
return t},
eO(a){return new A.bU(a,A.ex(a,!1,!0,!1,!1,""))},
dk(a,b,c){var t=J.cY(b)
if(!t.l())return a
if(c.length===0){do a+=A.j(t.gm())
while(t.l())}else{a+=A.j(t.gm())
while(t.l())a=a+c+A.j(t.gm())}return a},
en(a,b,c,d,e,f,g,h,i){var t=A.dh(a,b,c,d,e,f,g,h,i)
if(t==null)return null
return new A.z(A.d4(t,h,i),h,i)},
az(a,b,c){var t=A.dh(a,b,c,0,0,0,0,0,!1)
return new A.z(t==null?new A.bQ(a,b,c,0,0,0,0,0).$0():t,0,!1)},
ep(a){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d=$.dW().aw(a)
if(d!=null){t=new A.bS()
s=d.b
r=s[1]
r.toString
q=A.bE(r)
r=s[2]
r.toString
p=A.bE(r)
r=s[3]
r.toString
o=A.bE(r)
n=t.$1(s[4])
m=t.$1(s[5])
l=t.$1(s[6])
k=new A.bT().$1(s[7])
j=B.a.t(k,1000)
i=s[8]!=null
if(i){h=s[9]
if(h!=null){g=h==="-"?-1:1
r=s[10]
r.toString
f=A.bE(r)
m-=g*(t.$1(s[11])+60*f)}}e=A.en(q,p,o,n,m,l,j,k%1000,i)
if(e==null)throw A.b(A.b6("Time out of range",a))
return e}else throw A.b(A.b6("Invalid date format",a))},
al(a){var t,s
try{t=A.ep(a)
return t}catch(s){if(A.cW(s) instanceof A.b5)return null
else throw s}},
d4(a,b,c){var t="microsecond"
if(b<0||b>999)throw A.b(A.aJ(b,0,999,t,null))
if(a<-864e13||a>864e13)throw A.b(A.aJ(a,-864e13,864e13,"millisecondsSinceEpoch",null))
if(a===864e13&&b!==0)throw A.b(A.ec(b,t,"Time including microseconds is outside valid range"))
return a},
d3(a){var t=Math.abs(a),s=a<0?"-":""
if(t>=1000)return""+a
if(t>=100)return s+"0"+t
if(t>=10)return s+"00"+t
return s+"000"+t},
eo(a){var t=Math.abs(a),s=a<0?"-":"+"
if(t>=1e5)return s+t
return s+"0"+t},
bR(a){if(a>=100)return""+a
if(a>=10)return"0"+a
return"00"+a},
J(a){if(a>=10)return""+a
return"0"+a},
eq(a,b,c){return new A.b3(b+1000*c+864e8*a)},
b4(a){if(typeof a=="number"||A.cR(a)||a==null)return J.aY(a)
if(typeof a=="string")return JSON.stringify(a)
return A.eL(a)},
b_(a){return new A.aZ(a)},
cE(a){return new A.V(!1,null,null,a)},
ec(a,b,c){return new A.V(!0,a,b,c)},
aJ(a,b,c,d,e){return new A.bo(b,c,!0,a,d,"Invalid value")},
eN(a,b,c){if(0>a||a>c)throw A.b(A.aJ(a,0,c,"start",null))
if(a>b||b>c)throw A.b(A.aJ(b,a,c,"end",null))
return b},
eM(a,b){return a},
er(a,b,c,d){return new A.b7(b,!0,a,d,"Index out of range")},
bv(a){return new A.aP(a)},
W(a){return new A.b1(a)},
b6(a,b){return new A.b5(a,b)},
es(a,b,c){var t,s
if(A.cU(a)){if(b==="("&&c===")")return"(...)"
return b+"..."+c}t=A.d([],u.s)
$.af.push(a)
try{A.fJ(a,t)}finally{$.af.pop()}s=A.dk(b,t,", ")+c
return s.charCodeAt(0)==0?s:s},
d6(a,b,c){var t,s
if(A.cU(a))return b+"..."+c
t=new A.aM(b)
$.af.push(a)
try{s=t
s.a=A.dk(s.a,a,", ")}finally{$.af.pop()}t.a+=c
s=t.a
return s.charCodeAt(0)==0?s:s},
fJ(a,b){var t,s,r,q,p,o,n,m=a.gq(a),l=0,k=0
for(;;){if(!(l<80||k<3))break
if(!m.l())return
t=A.j(m.gm())
b.push(t)
l+=t.length+2;++k}if(!m.l()){if(k<=5)return
s=b.pop()
r=b.pop()}else{q=m.gm();++k
if(!m.l()){if(k<=4){b.push(A.j(q))
return}s=A.j(q)
r=b.pop()
l+=s.length+2}else{p=m.gm();++k
for(;m.l();q=p,p=o){o=m.gm();++k
if(k>100){for(;;){if(!(l>75&&k>3))break
l-=b.pop().length+2;--k}b.push("...")
return}}r=A.j(q)
s=A.j(p)
l+=s.length+r.length+4}}if(k>b.length+2){l+=5
n="..."}else n=null
for(;;){if(!(l>80&&b.length>3))break
l-=b.pop().length+2
if(n==null){l+=5
n="..."}}if(n!=null)b.push(n)
b.push(r)
b.push(s)},
eG(a,b){var t=B.a.gn(a)
b=B.a.gn(b)
b=A.eQ(A.dl(A.dl($.e6(),t),b))
return b},
bQ:function bQ(a,b,c,d,e,f,g,h){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h},
z:function z(a,b,c){this.a=a
this.b=b
this.c=c},
bS:function bS(){},
bT:function bT(){},
b3:function b3(a){this.a=a},
ck:function ck(){},
h:function h(){},
aZ:function aZ(a){this.a=a},
aO:function aO(){},
V:function V(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bo:function bo(a,b,c,d,e,f){var _=this
_.e=a
_.f=b
_.a=c
_.b=d
_.c=e
_.d=f},
b7:function b7(a,b,c,d,e){var _=this
_.f=a
_.a=b
_.b=c
_.c=d
_.d=e},
aP:function aP(a){this.a=a},
bq:function bq(a){this.a=a},
b1:function b1(a){this.a=a},
bk:function bk(){},
aL:function aL(){},
cl:function cl(a){this.a=a},
b5:function b5(a,b){this.a=a
this.b=b},
l:function l(){},
O:function O(a,b,c){this.a=a
this.b=b
this.$ti=c},
aG:function aG(){},
c:function c(){},
aM:function aM(a){this.a=a},
hh(a,b,c,d){var t,s
if(c==="pro"){if(b==null||b.ad(a))return B.B
return B.i}if(c==="trial"&&d!=null){t=d.V(12096e8)
if(t.ad(a)){s=B.d.a8(B.a.t(t.a9(a).a,1e6)/86400)
return new A.am(B.o,s<0?0:s)}return B.C}return B.i},
aI:function aI(a,b){this.a=a
this.b=b},
a5:function a5(a,b){this.a=a
this.b=b},
am:function am(a,b){this.a=a
this.b=b},
el(a2,a3,a4,a5,a6){var t,s,r,q,p,o,n,m,l,k,j,i,h,g=864e8,f=A.az(A.H(a5),A.Q(a5),A.ar(a5)),e=u.Y,d=A.d([],e),c=A.d([],e),b=A.d([],e),a=A.d([],e),a0=A.d([],e),a1=A.d([],e)
for(e=a2.length,t=f.a,s=f.b,r=0;r<a2.length;a2.length===e||(0,A.r)(a2),++r){q=a2[r]
p=A.bt(q,a3,a4)
o=q.b
n=A.az(A.H(o),A.Q(o),A.ar(o))
m=B.a.t(s-n.b+1000*(t-n.a),g)
l=m<0?0:m
k=A.em(q)
n=A.az(A.H(k),A.Q(k),A.ar(k))
m=B.a.t(s-n.b+1000*(t-n.a),g)
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
break}n=A.az(A.H(h),A.Q(h),A.ar(h))
m=B.a.t(s-n.b+1000*(t-n.a),g)
if((m<0?0:m)<=7){a1.push(i)
o=q.y
if(!(B.e.P(o==null?"":o).length!==0||q.ay.length!==0))a.push(i)}break}}B.c.A(d,new A.bK())
B.c.A(c,new A.bL())
B.c.A(b,new A.bM())
B.c.A(a,new A.bN())
B.c.A(a0,new A.bO())
B.c.A(a1,new A.bP())
e=u.G
return new A.bJ(A.G(d,e),A.G(c,e),A.G(b,e),A.G(a,e),A.G(a0,e),A.G(a1,e))},
em(a){var t,s,r,q,p,o,n=a.b
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
bJ:function bJ(a,b,c,d,e,f){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f},
bK:function bK(){},
bL:function bL(){},
bM:function bM(){},
bN:function bN(){},
bO:function bO(){},
bP:function bP(){},
ha(a,b,c,d,e,f){var t,s,r,q,p,o,n=B.d.af(A.fl(f)*12),m=B.d.ar(a==null||!isFinite(a)?0:a,0,100),l=m===0?0:Math.pow(1+m/100,0.08333333333333333)-1,k=b==null||!isFinite(b)?0:b,j=Math.max(0,k),i=Math.pow(1+l,n),h=j*i
if(c===B.k){k=d==null||!isFinite(d)?0:d
t=Math.max(0,k)
s=h+(l===0?t*n:t*((i-1)/l))
r=j+t*n
return new A.aB(c,t,s,r,Math.max(0,s-r),n,l,!1)}k=e==null||!isFinite(e)?0:e
q=Math.max(0,k)
if(h>=q)return new A.aB(c,0,h,j,Math.max(0,h-j),n,l,q>0)
p=q-h
o=l===0?p/n:p*l/(i-1)
r=j+o*n
return new A.aB(c,o,q,r,Math.max(0,q-r),n,l,!1)},
fV(a){var t
if(!isFinite(a)||a<=0)return null
t=(Math.pow(1+a,12)-1)*100
if(!isFinite(t)||t<=0)return null
return t>100?100:t},
fl(a){var t=a==null||!isFinite(a)?0:a
if(t<1)return 1
if(t>50)return 50
return t},
K:function K(a,b){this.a=a
this.b=b},
aB:function aB(a,b,c,d,e,f,g,h){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h},
dT(a){var t,s,r,q,p,o,n,m
if(a.length===0)return null
t=B.c.gO(a)
s=B.c.gO(a)
for(r=a.length,q=0;q<r;++q){p=a[q]
o=p.a
n=t.a
if(o>=n)n=o===n&&p.b<t.b
else n=!0
if(n)t=p
n=s.a
if(o<=n)o=o===n&&p.b>s.b
else o=!0
if(o)s=p}m=B.a.t(s.a9(t).a,1000)/864e5/30.44
return r/(m<1?1:m)},
hr(a,b,c,d){var t,s,r,q,p,o,n,m,l,k=null,j=A.d([],u.g)
for(t=d.length,s=0;s<d.length;d.length===t||(0,A.r)(d),++s){r=d[s]
if(r.z===B.h&&r.x!=null){q=r.x
q.toString
j.push(q)}}if(!isFinite(a)||a<=0)return B.I
if(c<=a)return B.H
t=j.length
if(t<10)return new A.X(B.q,0,!1,k,k,k,k,t)
p=A.dT(j)
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
d8(f9,g0,g1){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,d0,d1,d2,d3,d4,d5,d6,d7,d8,d9,e0,e1,e2,e3,e4,e5,e6,e7,e8,e9,f0,f1,f2,f3,f4,f5=null,f6=u.J,f7=A.d([],f6),f8=A.d([],f6)
for(f6=f9.length,t=0;t<f9.length;f9.length===f6||(0,A.r)(f9),++t){s=f9[t]
r=s.z
if(!(r===B.f||r===B.h))continue
f7.push(s)
if(s.w!=null&&s.x!=null)f8.push(s)}if(f7.length===0)return B.L
B.c.A(f8,new A.bW())
f6=u.N
r=u.S
q=A.a7(f6,r)
for(p=f7.length,o=0,n=0,m=0,t=0;t<f7.length;f7.length===p||(0,A.r)(f7),++t){s=f7[t]
l=A.bt(s,g0,g1)
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
l=A.bt(s,g0,g1)
b4=l.d
if(b4==null)continue
b5=s.x
a9+=b4
r=s.b
p=b5.a
b6=B.a.t(b5.b-r.b+1000*(p-r.a),864e8)
b7=0
if(b6>=0){a1+=b6;++a2}if(b4>0){a3+=b4
a5+=b4;++a6;++b0
b1=b7}else{if(b4<0){a4+=b4
a7+=b4;++a8;++b1}else b1=b7
b0=0}if(b0>b2)b2=b0
if(b1>b3)b3=b1
if(a0==null||b4>a0.c)a0=new A.bs(s.a,s.c,b4,b5)
if(a==null||b4<a.c)a=new A.bs(s.a,s.c,b4,b5)
b8=l.f
if(b8!=null)h.push(b8)
r=g.h(0,A.cJ(b5))
if(r==null)r=0
g.B(0,A.cJ(b5),r+b4)
r=f.h(0,A.Q(b5))
if(r==null)r=0
f.B(0,A.Q(b5),r+b4)
b9=A.az(A.H(b5),A.Q(b5),1)
r=e.h(0,b9)
if(r==null){r=new A.aQ()
e.B(0,b9,r)}r.a+=b4;++r.b
c0=A.az(A.H(b5),A.Q(b5),A.ar(b5))
c1=c0.V(0-864e8*B.a.K(A.cJ(c0)+1,7))
r=d.h(0,c1)
if(r==null){r=new A.aQ()
d.B(0,c1,r)}r.a+=b4;++r.b
for(r=s.Q,r=new A.i(r,new A.bX(),A.v(r).i("i<1,a>")).aE(0),p=A.x(r),i=new A.au(r,r.r,p.i("au<1>")),i.c=r.e,p=p.c;i.l();){r=i.d
if(r==null)r=p.a(r)
if(r.length===0)continue
c2=c.h(0,r)
if(c2==null){c2=new A.T()
c.B(0,r,c2)
r=c2}else r=c2
r.N(0,b4)}r=s.ch
c3=r==null?f5:B.e.P(r)
if(c3!=null&&c3.length!==0){r=b.h(0,c3)
if(r==null){r=new A.T()
b.B(0,c3,r)}r.N(0,b4)}}for(f6=new A.M(q,q.$ti.i("M<1,2>")).gq(0),c4=f5,c5=0;f6.l();){c6=f6.d
c7=c6.b
if(c7<=c5){p=!1
if(c7===c5)if(c4!=null){p=c6.a
if(p===c4)p=0
else p=p<c4?-1:1
p=p<0}}else p=!0
if(p){c4=c6.a
c5=c7}}c8=A.c1(g,!0)
c9=A.c1(g,!1)
d0=A.c1(f,!0)
d1=A.c1(f,!1)
f6=new A.bZ()
d2=f6.$1(c)
d3=f6.$1(b)
f6=a2===0?f5:a1/a2
p=A.U(o,f7.length)
i=m===0?f5:n/m
c2=A.d9(e)
d4=A.d9(d)
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
e7=h.length===0?f5:B.c.aD(h,new A.bY())/h.length
e8=A.ey(h)
r=r===0?f5:a9/r
e9=a4===0?f5:a3/Math.abs(a4)
f0=u.M
f1=A.G(d2,f0)
f2=d2.length===0?f5:B.c.gO(d2)
f3=d2.length===0?f5:B.c.gae(d2)
f0=A.G(d3,f0)
f4=d3.length===0?f5:B.c.gO(d3)
return new A.bc(f6,b2,b3,a0,a,c4,c5,p,i,c2,d4,d6,d5,d8,d7,e0,d9,e2,e1,e3,e4,e5,e6,e7,e8,r,e9,f1,f2,f3,f0,f4,d3.length===0?f5:B.c.gae(d3))},
d9(a){var t,s,r,q=A.x(a).i("N<1>"),p=A.A(new A.N(a,q),q.i("l.E"))
B.c.a3(p)
q=[]
for(t=p.length,s=0;s<p.length;p.length===t||(0,A.r)(p),++s){r=p[s]
q.push(new A.a9(r,a.h(0,r).a,a.h(0,r).b))}return A.G(q,u._)},
c1(a,b){var t,s,r,q,p,o
for(t=new A.M(a,A.x(a).i("M<1,2>")).gq(0),s=null;t.l();){r=t.d
r.toString
q=!0
if(s!=null){p=r.b
o=s.b
if(!(b?p>o:p<o))q=p===o&&r.a<s.a}if(q)s=r}return s},
ey(a){var t,s,r
if(a.length===0)return null
t=A.A(a,u.i)
B.c.a3(t)
s=t.length
r=s/2|0
if((s&1)===1)return t[r]
return(t[r-1]+t[r])/2},
a9:function a9(a,b,c){this.a=a
this.b=b
this.c=c},
u:function u(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bs:function bs(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
bc:function bc(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,b0,b1,b2){var _=this
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
bW:function bW(){},
bX:function bX(){},
bZ:function bZ(){},
c_:function c_(){},
c0:function c0(){},
bY:function bY(){},
aQ:function aQ(){this.b=this.a=0},
T:function T(){this.c=this.b=this.a=0},
ez(a8,a9,b0){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3,a4,a5,a6=null,a7=A.d([],u.J)
for(t=a8.length,s=0,r=0,q=0,p=0,o=0,n=0,m=0;m<a8.length;a8.length===t||(0,A.r)(a8),++m){l=a8[m]
if(l.as)++p
k=l.ax
if(k.length!==0){o+=A.cx(k);++n}switch(l.z.a){case 0:++r
break
case 3:++q
break
case 1:++s
break
case 2:if(l.w==null||l.x==null)++s
else a7.push(l)
break}}B.c.A(a7,new A.c3())
j=A.d([],u.t)
if(a7.length!==0){t=B.c.gO(a7).x
t.toString
j.push(new A.an(t,a9))}for(t=a7.length,i=0,h=0,g=0,f=0,e=0,d=0,c=0,b=0,m=0;k=a7.length,m<k;a7.length===t||(0,A.r)(a7),++m){l=a7[m]
a=A.bt(l,a9,b0)
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
return new A.c2(k,h,g,f,s,r,q,p,t,a2,i,a3,a4,a5,a9+i,A.U(i,a9),A.G(j,u.I))},
an:function an(a,b){this.a=a
this.b=b},
c2:function c2(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q){var _=this
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
c3:function c3(){},
eH(a,b,c){var t,s,r,q,p,o,n,m,l,k,j,i,h,g=A.d([],u.J)
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s){r=a[s]
if(r.z===B.f&&r.r>0)g.push(r)}if(g.length===0)return B.V
t=u.n
q=A.d([],t)
p=A.d([],t)
for(t=g.length,o=0,n=0,s=0;s<g.length;g.length===t||(0,A.r)(g),++s){r=g[s]
m=A.eJ(r,c)
if(m==null)l=0
else{k=(m-r.e)*r.r
l=isFinite(k)?k:0}j=A.eI(r,b)
if(j==null)i=0
else{k=(j-r.e)*r.r
i=isFinite(k)?k:0}q.push(l)
p.push(i)
o+=l
n+=i}t=A.d([],u.o)
for(h=0;h<g.length;++h){k=g[h]
t.push(new A.P(k.a,k.c,q[h]+(n-p[h])))}B.c.A(t,new A.cc())
return new A.bl(g.length,o,n,A.G(t,u.R))},
eJ(a,b){var t=a.CW
if(t!=null&&isFinite(t)&&t>a.e)return t
if(!isFinite(b)||b<=0)return null
return A.ax(a.e*(1+b))},
eI(a,b){var t,s=a.f
if(isFinite(s)&&s>0&&s<a.e)return s
if(!isFinite(b)||b<=0)return null
t=A.ax(a.e*(1-b))
if(t==null||t<=0)return null
return t},
P:function P(a,b,c){this.a=a
this.b=b
this.c=c},
bl:function bl(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
cc:function cc(){},
cK:function cK(a,b,c,d){var _=this
_.a=a
_.b=b
_.c=c
_.d=d},
dj(a,b,a0,a1,a2,a3){var t,s,r,q,p,o,n,m=null,l=A.dP(b,a1),k=a0!=null&&isFinite(a0)&&a0>0?a0:m,j=a2!=null&&isFinite(a2)&&a2>0?a2:m,i=k!=null,h=i&&j!=null&&k>j?k-j:m,g=i&&j!=null?A.dS(k,l,j):m,f=a!=null&&isFinite(a)&&a>0?a:m,e=f!=null&&i?B.d.aa(f/k):m,d=g==null,c=!d
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
i=p!=null&&A.cy(p,a1)
return new A.ce(l,h,t,r,o,q,p,i,g===0,s,f)},
ce:function ce(a,b,c,d,e,f,g,h,i,j,k){var _=this
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
aN:function aN(a,b){this.a=a
this.b=b},
cM:function cM(a,b,c,d,e,f,g,h,i,j,k,l){var _=this
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
bt(a,b,c){var t,s,r,q,p,o,n,m,l,k=null,j=a.r,i=a.e,h=i*j
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
return new A.ch(h,t,s,o,l,m,q,s!=null&&A.cy(s,c),n)},
at:function at(a,b){this.a=a
this.b=b},
ch:function ch(a,b,c,d,e,f,g,h,i){var _=this
_.a=a
_.b=b
_.c=c
_.d=d
_.e=e
_.f=f
_.r=g
_.w=h
_.x=i},
ef(a){var t,s
for(t=0;t<6;++t){s=B.l[t]
if(s.c===a)return s}return null},
cx(a){var t,s,r,q=A.eC(u.N)
for(t=a.length,s=0;s<a.length;a.length===t||(0,A.r)(a),++s){r=a[s]
if(A.ef(r)!=null)q.N(0,r)}return q.a/6},
I:function I(a,b,c,d){var _=this
_.c=a
_.d=b
_.a=c
_.b=d},
br:function br(a){this.a=a},
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
eR(a,b){var t,s
for(t=0;t<4;++t){s=B.O[t]
if(s.b===a)return s}return b},
ab:function ab(a,b){this.a=a
this.b=b},
cw(a){var t,s,r,q
if(u.j.b(a)){t=A.d([],u.s)
for(s=a.length,r=0;r<a.length;a.length===s||(0,A.r)(a),++r){q=a[r]
if(typeof q=="string")t.push(q)}}else t=B.R
return t},
cS(a3){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a=null,a0="exitPrice",a1="timeline",a2=A.a2(a3.h(0,"id"))
if(a2==null)a2=""
t=a3.h(0,"entryDate")
t=typeof t=="string"?A.al(t):a
if(t==null)t=new A.z(Date.now(),0,!1)
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
o=A.bA(a3.h(0,"quantity"))
o=o==null?a:B.d.S(o)
if(o==null)o=0
n=a3.h(0,a0)
n=typeof n=="number"?n:a
m=a3.h(0,"exitDate")
m=typeof m=="string"?A.al(m):a
l=A.a2(a3.h(0,"notes"))
k=A.a2(a3.h(0,"status"))
k=A.eR(k,a3.h(0,a0)==null?B.f:B.h)
j=A.cw(a3.h(0,"tags"))
i=J.cD(a3.h(0,"isFavorite"),!0)
A.cw(a3.h(0,"screenshotPaths"))
h=A.cw(a3.h(0,"completedChecklistItems"))
g=A.d([],u.O)
f=u.j
if(f.b(a3.h(0,a1)))for(f=f.a(a3.h(0,a1)),e=f.length,d=0;d<f.length;f.length===e||(0,A.r)(f),++d){c=f[d]
if(c instanceof A.B){b=c.h(0,"date")
b=typeof b=="string"?A.al(b):a
if(b==null)b=new A.z(Date.now(),0,!1)
A.a2(c.h(0,"text"))
g.push(new A.br(b))}}f=A.a2(a3.h(0,"source"))
e=a3.h(0,"takeProfitPrice")
return new A.a_(a2,t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,typeof e=="number"?e:a)},
bC(a){var t,s,r,q,p,o
if(u.j.b(a)){t=A.d([],u.J)
for(s=a.length,r=u.N,q=u.z,p=0;p<a.length;a.length===s||(0,A.r)(a),++p){o=a[p]
if(o instanceof A.B)t.push(A.cS(A.cI(o,r,q)))}}else t=B.S
return t},
fL(a){return A.o(["start",a.a.T(),"pnl",a.b,"tradeCount",a.c],u.N,u.X)},
bB(a){return a==null?null:A.o(["tag",a.a,"totalPnl",a.b,"tradeCount",a.c,"winCount",a.d],u.N,u.X)},
dC(a){return a==null?null:A.o(["tradeId",a.a,"ticker",a.b,"pnl",a.c,"exitDate",a.d.T()],u.N,u.X)},
dH(a){return A.o(["positionValue",a.a,"riskEgp",a.b,"riskPct",a.c,"pnl",a.d,"returnPct",a.e,"rMultiple",a.f,"isOpen",a.r,"overRisk",a.w,"result",a.x.b],u.N,u.X)},
fI(a){var t=a.a
return A.o(["tradeId",t.a,"ticker",t.c,"metrics",A.dH(a.b),"daysSinceEntry",a.c,"daysSinceUpdate",a.d],u.N,u.X)},
dJ(a){return A.o(["maxLoss",a.a,"riskPerShare",a.b,"suggestedQty",a.c,"effectiveQty",a.d,"positionValue",a.e,"riskEgp",a.f,"riskPct",a.r,"overRisk",a.w,"capitalTooSmall",a.x,"limitedByBudget",a.y,"budget",a.z],u.N,u.X)},
fU(a){var t,s,r,q,p,o,n,m,l=null,k=u.P.a(B.b.u(a,l)),j=A.bC(k.h(0,"trades")),i=k.h(0,"capital")
i=typeof i=="number"?i:l
if(i==null)i=0
t=k.h(0,"maxRiskPercent")
t=typeof t=="number"?t:l
s=A.d8(j,i,t==null?0:t)
j=A.dC(s.d)
i=A.dC(s.e)
t=s.y
r=A.v(t).i("i<1,f<a,c?>>")
t=A.A(new A.i(t,A.dK(),r),r.i("m.E"))
r=s.z
q=A.v(r).i("i<1,f<a,c?>>")
r=A.A(new A.i(r,A.dK(),q),q.i("m.E"))
q=s.id
p=A.v(q).i("i<1,f<a,c?>?>")
q=A.A(new A.i(q,A.dL(),p),p.i("m.E"))
p=A.bB(s.k1)
o=A.bB(s.k2)
n=s.k3
m=A.v(n).i("i<1,f<a,c?>?>")
n=A.A(new A.i(n,A.dL(),m),m.i("m.E"))
return B.b.v(A.o(["averageHoldingDays",s.a,"longestWinStreak",s.b,"longestLossStreak",s.c,"bestTrade",j,"worstTrade",i,"mostTradedTicker",s.f,"mostTradedTickerCount",s.r,"averagePositionValue",s.w,"averageRiskPct",s.x,"monthlyPnl",t,"weeklyPnl",r,"bestWeekday",s.Q,"bestWeekdayPnl",s.as,"worstWeekday",s.at,"worstWeekdayPnl",s.ax,"bestMonth",s.ay,"bestMonthPnl",s.ch,"worstMonth",s.CW,"worstMonthPnl",s.cx,"averageProfit",s.cy,"averageLoss",s.db,"largestGain",s.dx,"largestLoss",s.dy,"averageR",s.fr,"medianR",s.fx,"expectancy",s.fy,"profitFactor",s.go,"tagStats",q,"mostProfitableTag",p,"mostLosingTag",o,"sourceStats",n,"bestSource",A.bB(s.k4),"worstSource",A.bB(s.ok)],u.N,u.X),l)},
hz(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bC(m.h(0,"trades")),k=m.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=m.h(0,"maxRiskPercent")
t=typeof t=="number"?t:n
s=A.ez(l,k,t==null?0:t)
l=A.d([],u.x)
for(k=s.ch,t=k.length,r=u.N,q=u.K,p=0;p<t;++p){o=k[p]
l.push(A.o(["date",o.a.T(),"equity",o.b],r,q))}return B.b.v(A.o(["closedCount",s.a,"winCount",s.b,"lossCount",s.c,"breakevenCount",s.d,"openCount",s.e,"plannedCount",s.f,"cancelledCount",s.r,"favoriteCount",s.w,"averageChecklistCompletion",s.x,"winRate",s.y,"totalPnl",s.z,"averageR",s.Q,"avgWinEgp",s.as,"avgLossEgp",s.at,"currentCapital",s.ax,"totalReturnPct",s.ay,"equityCurve",l],r,u.X),n)},
hf(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bC(m.h(0,"trades")),k=m.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=m.h(0,"maxRiskPercent")
t=typeof t=="number"?t:n
if(t==null)t=0
s=m.h(0,"today")
s=typeof s=="string"?A.al(s):n
if(s==null)s=new A.z(Date.now(),0,!1)
r=A.bA(m.h(0,"waitingThresholdDays"))
r=r==null?n:B.d.S(r)
q=A.el(l,k,t,s,r==null?7:r)
l=q.a
k=A.v(l).i("i<1,f<a,c?>>")
l=A.A(new A.i(l,A.aX(),k),k.i("m.E"))
k=q.b
t=A.v(k).i("i<1,f<a,c?>>")
k=A.A(new A.i(k,A.aX(),t),t.i("m.E"))
t=q.c
s=A.v(t).i("i<1,f<a,c?>>")
t=A.A(new A.i(t,A.aX(),s),s.i("m.E"))
s=q.d
r=A.v(s).i("i<1,f<a,c?>>")
s=A.A(new A.i(s,A.aX(),r),r.i("m.E"))
r=q.e
p=A.v(r).i("i<1,f<a,c?>>")
r=A.A(new A.i(r,A.aX(),p),p.i("m.E"))
p=q.f
o=A.v(p).i("i<1,f<a,c?>>")
p=A.A(new A.i(p,A.aX(),o),o.i("m.E"))
return B.b.v(A.o(["overRisk",l,"open",k,"planned",t,"needsReview",s,"waitingTooLong",r,"recentlyClosed",p],u.N,u.A),n)},
hw(a){var t,s,r,q,p,o,n=null,m=u.P.a(B.b.u(a,n)),l=A.bC(m.h(0,"trades")),k=m.h(0,"defaultTakeProfitPercent")
k=typeof k=="number"?k:n
if(k==null)k=0.05
t=m.h(0,"defaultStopLossPercent")
t=typeof t=="number"?t:n
s=A.eH(l,t==null?0.02:t,k)
l=A.d([],u.x)
for(k=s.d,t=k.length,r=u.N,q=u.K,p=0;p<t;++p){o=k[p]
l.push(A.o(["tradeId",o.a,"ticker",o.b,"net",o.c],r,q))}return B.b.v(A.o(["openCount",s.a,"totalExpectedProfit",s.b,"totalExpectedLoss",s.c,"oneWinner",l],r,u.X),n)},
hv(a){var t,s,r,q,p=null,o=u.P.a(B.b.u(a,p)),n=u.N,m=A.cS(A.cI(u.f.a(o.h(0,"trade")),n,u.z)),l=o.h(0,"capital")
l=typeof l=="number"?l:p
if(l==null)l=0
t=o.h(0,"maxRiskPercent")
t=typeof t=="number"?t:p
if(t==null)t=0
s=m.e
r=m.f
q=A.U((s-r)*m.r,l)
l=A.cx(m.ax)
t=q!=null&&!A.cy(q,t)
s=r>0&&r<s
return B.b.v(A.o(["checklistComplete",l>=1,"riskWithinLimit",t,"hasStop",s,"hasDetailedReason",B.e.P(m.d).length>20],n,u.y),p)},
hD(a){var t,s=null,r=u.P.a(B.b.u(a,s)),q=A.cS(A.cI(u.f.a(r.h(0,"trade")),u.N,u.z)),p=r.h(0,"capital")
p=typeof p=="number"?p:s
if(p==null)p=0
t=r.h(0,"maxRiskPercent")
t=typeof t=="number"?t:s
return B.b.v(A.dH(A.bt(q,p,t==null?0:t)),s)},
hx(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=n.h(0,"capital")
m=typeof m=="number"?m:o
if(m==null)m=0
t=n.h(0,"maxRiskPercent")
t=typeof t=="number"?t:o
if(t==null)t=0
s=n.h(0,"entry")
s=typeof s=="number"?s:o
r=n.h(0,"stop")
r=typeof r=="number"?r:o
q=A.bA(n.h(0,"userQty"))
q=q==null?o:B.d.S(q)
p=n.h(0,"budget")
return B.b.v(A.dJ(A.dj(typeof p=="number"?p:o,m,s,t,r,q)),o)},
hy(a7){var t,s,r,q,p,o,n,m,l,k,j,i,h,g,f,e,d,c,b,a,a0,a1,a2,a3=null,a4="takeProfitPercent",a5=u.P.a(B.b.u(a7,a3)),a6=a5.h(0,"capital")
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
q=A.bA(a5.h(0,"userQty"))
q=q==null?a3:B.d.S(q)
o=a5.h(0,"stopPrice")
o=typeof o=="number"?o:a3
n=a5.h(0,"targetPrice")
n=typeof n=="number"?n:a3
m=a5.h(0,"budget")
m=typeof m=="number"?m:a3
p=p!=null&&isFinite(p)&&p>0?p:a3
l=n!=null&&isFinite(n)&&n>0&&p!=null&&n>p?A.ax(n):a3
n=l==null
if(!n){p.toString
k=(l-p)/p}else k=isFinite(s)&&s>0?s:0
j=o!=null&&isFinite(o)&&o>0&&p!=null&&o<p?A.ax(o):a3
s=j==null
if(!s){p.toString
i=(p-j)/p}else i=isFinite(r)&&r>0&&r<1?r:0
r=p!=null
if(r){h=n&&k>0?A.ax(p*(1+k)):l
g=s&&i>0?A.ax(p*(1-i)):j}else{g=j
h=l}if(h!=null&&r&&h<=p)h=a3
if(g!=null&&r&&g>=p)g=a3
f=r&&h!=null?h-p:a3
e=r&&g!=null?p-g:a3
s=f!=null
d=s&&e!=null?A.U(f,e):a3
if(d==null)c=a3
else if(A.cV(d,2))c=B.a_
else c=A.cV(d,1)?B.a0:B.a1
b=A.dj(m,a6,p,t,g,q)
a=b.d
a0=a3
a1=a3
if(a!=null&&a>0){if(s){a2=f*a
a0=isFinite(a2)?a2:a3}if(e!=null){a2=-e*a
a1=isFinite(a2)?a2:a3}}a6=c==null?a3:c.b
return B.b.v(A.o(["entryPrice",p,a4,k,"stopLossPercent",i,"takeProfitPrice",h,"stopLossPrice",g,"rewardPerShare",f,"riskPerShare",e,"rewardRiskRatio",d,"quality",a6,"sizing",A.dJ(b),"expectedProfit",a0,"expectedLoss",a1],u.N,u.X),a3)},
hn(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=B.c.az(B.P,new A.cz(n),new A.cA()),l=n.h(0,"targetAmount")
l=typeof l=="number"?l:o
t=n.h(0,"monthlyDeposit")
t=typeof t=="number"?t:o
s=n.h(0,"years")
s=typeof s=="number"?s:o
r=n.h(0,"annualReturnPercent")
r=typeof r=="number"?r:o
q=n.h(0,"initialAmount")
p=A.ha(r,typeof q=="number"?q:o,m,t,l,s)
m=p.r
return B.b.v(A.o(["mode",p.a.b,"monthlyDeposit",p.b,"futureValue",p.c,"totalDeposited",p.d,"growth",p.e,"months",p.f,"monthlyRate",m,"coveredByInitial",p.w,"annualFromMonthly",A.fV(m),"minYears",1,"maxYears",50,"maxAnnualReturn",100],u.N,u.X),o)},
hs(a){var t,s,r,q,p,o=null,n=u.P.a(B.b.u(a,o)),m=A.bC(n.h(0,"trades")),l=n.h(0,"capital")
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
q=A.hr(l,A.d8(m,s,r==null?0:r).fy,t,m)
l=A.d([],u.g)
for(t=m.length,p=0;p<m.length;m.length===t||(0,A.r)(m),++p){s=m[p].x
if(s!=null)l.push(s)}return B.b.v(A.o(["kind",q.a.b,"months",q.b,"beyondHorizon",q.c,"expectancy",q.d,"tradesPerMonth",q.e,"monthlyProfit",q.f,"monthlyRate",q.r,"closedCount",q.w,"minClosedTrades",10,"maxMonths",600,"tradesPerMonthDirect",A.dT(l)],u.N,u.X),o)},
hg(a){var t,s,r,q,p,o,n,m,l=null,k=u.P.a(B.b.u(a,l)),j=k.h(0,"trialStartedAt"),i=typeof j=="string"?A.al(j):l
j=A.a2(k.h(0,"plan"))
t=k.h(0,"proUntil")
t=typeof t=="string"?A.al(t):l
s=k.h(0,"now")
s=typeof s=="string"?A.al(s):l
r=A.hh(s==null?new A.z(Date.now(),0,!1):s,t,j,i)
j=r.a
t=r.b
if(j===B.o)s=(t==null?99:t)<=5
else s=!1
q=u.N
p=A.a7(q,u.y)
for(o=0;o<4;++o){n=B.Q[o]
p.B(0,n.b,!0)}m=i==null?l:i.V(12096e8)
m=m==null?l:m.T()
return B.b.v(A.o(["plan",j.b,"trialDaysLeft",t,"shouldWarnAboutTrial",s,"features",p,"trialEndsAt",m,"trialDays",14,"everythingFree",!0],q,u.X),l)},
hu(a){var t,s,r,q,p,o,n=null,m="maxRiskPercent",l=u.P.a(B.b.u(a,n)),k=l.h(0,"capital")
k=typeof k=="number"?k:n
if(k==null)k=0
t=l.h(0,m)
t=typeof t=="number"?t:n
s=A.dP(k,t==null?0:t)
k=l.h(0,"entry")
k=typeof k=="number"?k:n
if(k==null)k=0
t=l.h(0,"stop")
t=typeof t=="number"?t:n
k=A.dS(k,s,t==null?0:t)
t=l.h(0,"price")
t=typeof t=="number"?t:n
t=A.ax(t==null?0:t)
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
q=A.cV(q,p==null?0:p)
p=l.h(0,"riskPct")
p=typeof p=="number"?p:n
if(p==null)p=0
o=l.h(0,m)
o=typeof o=="number"?o:n
return B.b.v(A.o(["maxLoss",s,"suggestedQuantity",k,"roundToPiastre",t,"safeDiv",r,"meetsRatio",q,"exceedsRiskLimit",A.cy(p,o==null?0:o)],u.N,u.X),n)},
h9(a){var t,s,r,q=A.cw(B.b.u(a,null)),p=A.cx(q),o=A.cx(q),n=A.d([],u.p)
for(t=u.N,s=0;s<6;++s){r=B.l[s]
n.push(A.o(["id",r.c,"label",r.d],t,t))}return B.b.v(A.o(["completion",p,"complete",o>=1,"items",n],t,u.K),null)},
cz:function cz(a){this.a=a},
cA:function cA(){},
hq(){var t={},s=new A.cB(t)
s.$2("analytics",A.fX())
s.$2("stats",A.h7())
s.$2("decisions",A.fZ())
s.$2("scenarios",A.h4())
s.$2("riskScore",A.h3())
s.$2("tradeMetrics",A.h8())
s.$2("sizing",A.h5())
s.$2("smartTrade",A.h6())
s.$2("goalPlan",A.h0())
s.$2("projection",A.h1())
s.$2("entitlement",A.h_())
s.$2("riskMath",A.h2())
s.$2("checklist",A.fY())
v.G.radarCalc=t},
cB:function cB(a){this.a=a},
cC:function cC(a){this.a=a},
hA(a){throw A.q(new A.bf("Field '"+a+"' has been assigned during initialization."),new Error())},
fk(a,b,c){if(c>=1)return a.$1(b)
return a.$0()},
U(a,b){var t
if(!isFinite(a)||!isFinite(b)||b===0)return null
t=a/b
return isFinite(t)?t:null},
dP(a,b){var t
if(!isFinite(a)||!isFinite(b))return 0
if(a<=0||b<=0)return 0
t=a*b
return isFinite(t)?t:0},
dS(a,b,c){var t,s,r,q=null
if(!isFinite(a)||!isFinite(c)||!isFinite(b))return q
if(b<=0)return q
t=a-c
if(t<=0)return q
s=A.U(b,t)
if(s==null)return q
r=B.d.aa(s+1e-9)
return r>0?r:0},
ax(a){var t
if(!isFinite(a))return null
t=B.d.af(a*100)/100
return isFinite(t)?t:null},
cV(a,b){if(a==null||!isFinite(a))return!1
return a-b>-1e-9},
cy(a,b){if(!isFinite(a)||!isFinite(b))return!1
return a-b>1e-9}},B={}
var w=[A,J,B]
var $={}
A.cG.prototype={}
J.b8.prototype={
G(a,b){return a===b},
gn(a){return A.bm(a)},
j(a){return"Instance of '"+A.bn(a)+"'"},
gF(a){return A.ag(A.cQ(this))}}
J.ba.prototype={
j(a){return String(a)},
gn(a){return a?519018:218159},
gF(a){return A.ag(u.y)},
$iR:1,
$iaW:1}
J.aD.prototype={
G(a,b){return null==b},
j(a){return"null"},
gn(a){return 0},
$iR:1}
J.aq.prototype={$iap:1}
J.Y.prototype={
gn(a){return 0},
j(a){return String(a)}}
J.cb.prototype={}
J.a0.prototype={}
J.aE.prototype={
j(a){var t=a[$.dV()]
if(t==null)t=a[$.cX()]
if(t==null)return this.aj(a)
return"JavaScript function for "+J.aY(t)}}
J.e.prototype={
aD(a,b){var t,s,r=a.length
if(r===0)throw A.b(A.cF())
t=a[0]
for(s=1;s<r;++s){t=b.$2(t,a[s])
if(r!==a.length)throw A.b(A.W(a))}return t},
az(a,b,c){var t,s,r,q=a.length
for(t=0;t<q;++t){s=a[t]
if(b.$1(s))return s
if(a.length!==q)throw A.b(A.W(a))}r=c.$0()
return r},
E(a,b){return a[b]},
gO(a){if(a.length>0)return a[0]
throw A.b(A.cF())},
gae(a){var t=a.length
if(t>0)return a[t-1]
throw A.b(A.cF())},
A(a,b){var t,s,r,q,p
a.$flags&2&&A.hB(a,"sort")
t=a.length
if(t<2)return
if(b==null)b=J.fv()
if(t===2){s=a[0]
r=a[1]
if(b.$2(s,r)>0){a[0]=r
a[1]=s}return}q=0
if(A.v(a).c.b(null))for(p=0;p<a.length;++p)if(a[p]===void 0){a[p]=null;++q}a.sort(A.hb(b,2))
if(q>0)this.ao(a,q)},
a3(a){return this.A(a,null)},
ao(a,b){var t,s=a.length
for(;t=s-1,s>0;s=t)if(a[t]===null){a[t]=void 0;--b
if(b===0)break}},
j(a){return A.d6(a,"[","]")},
gq(a){return new J.ak(a,a.length,A.v(a).i("ak<1>"))},
gn(a){return A.bm(a)},
gp(a){return a.length},
$ik:1,
$iZ:1}
J.b9.prototype={
aF(a){var t,s,r
if(!Array.isArray(a))return null
t=a.$flags|0
if((t&4)!==0)s="const, "
else if((t&2)!==0)s="unmodifiable, "
else s=(t&1)!==0?"fixed, ":""
r="Instance of '"+A.bn(a)+"'"
if(s==="")return r
return r+" ("+s+"length: "+a.length+")"}}
J.bV.prototype={}
J.ak.prototype={
gm(){var t=this.d
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
return t+0}throw A.b(A.bv(""+a+".toInt()"))},
a8(a){var t,s
if(a>=0){if(a<=2147483647){t=a|0
return a===t?t:t+1}}else if(a>=-2147483648)return a|0
s=Math.ceil(a)
if(isFinite(s))return s
throw A.b(A.bv(""+a+".ceil()"))},
aa(a){var t,s
if(a>=0){if(a<=2147483647)return a|0}else if(a>=-2147483648){t=a|0
return a===t?t:t-1}s=Math.floor(a)
if(isFinite(s))return s
throw A.b(A.bv(""+a+".floor()"))},
af(a){if(a>0){if(a!==1/0)return Math.round(a)}else if(a>-1/0)return 0-Math.round(0-a)
throw A.b(A.bv(""+a+".round()"))},
ar(a,b,c){if(B.a.k(b,c)>0)throw A.b(A.fW(b))
if(this.k(a,b)<0)return b
if(this.k(a,c)>0)return c
return a},
j(a){if(a===0&&1/a<0)return"-0.0"
else return""+a},
gn(a){var t,s,r,q,p=a|0
if(a===p)return p&536870911
t=Math.abs(a)
s=Math.log(t)/0.6931471805599453|0
r=Math.pow(2,s)
q=t<1?t/r:r/t
return((q*9007199254740992|0)+(q*3542243181176521|0))*599197+s*1259&536870911},
K(a,b){var t=a%b
if(t===0)return 0
if(t>0)return t
return t+b},
t(a,b){return(a|0)===a?a/b|0:this.aq(a,b)},
aq(a,b){var t=a/b
if(t>=-2147483648&&t<=2147483647)return t|0
if(t>0){if(t!==1/0)return Math.floor(t)}else if(t>-1/0)return Math.ceil(t)
throw A.b(A.bv("Result of truncating division is "+A.j(t)+": "+A.j(a)+" ~/ "+b))},
a7(a,b){var t
if(a>0)t=this.ap(a,b)
else{t=b>31?31:b
t=a>>t>>>0}return t},
ap(a,b){return b>31?0:a>>>b},
gF(a){return A.ag(u.H)},
$iD:1}
J.aC.prototype={
gF(a){return A.ag(u.S)},
$iR:1,
$iw:1}
J.bb.prototype={
gF(a){return A.ag(u.i)},
$iR:1}
J.a6.prototype={
L(a,b,c){return a.substring(b,A.eN(b,c,a.length))},
P(a){var t,s,r,q=a.trim(),p=q.length
if(p===0)return q
if(q.charCodeAt(0)===133){t=J.ev(q,1)
if(t===p)return""}else t=0
s=p-1
r=q.charCodeAt(s)===133?J.ew(q,s):p
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
aC(a,b,c){var t=b-a.length
if(t<=0)return a
return this.ai(c,t)+a},
k(a,b){var t
if(a===b)t=0
else t=a<b?-1:1
return t},
j(a){return a},
gn(a){var t,s,r
for(t=a.length,s=0,r=0;r<t;++r){s=s+a.charCodeAt(r)&536870911
s=s+((s&524287)<<10)&536870911
s^=s>>6}s=s+((s&67108863)<<3)&536870911
s^=s>>11
return s+((s&16383)<<15)&536870911},
gF(a){return A.ag(u.N)},
$iR:1,
$ia:1}
A.bf.prototype={
j(a){return"LateInitializationError: "+this.a}}
A.cd.prototype={}
A.k.prototype={}
A.m.prototype={
gq(a){var t=this
return new A.bi(t,t.gp(t),A.x(t).i("bi<m.E>"))},
gI(a){return this.gp(this)===0},
aE(a){var t,s=this,r=A.eB(A.x(s).i("m.E"))
for(t=0;t<s.gp(s);++t)r.N(0,s.E(0,t))
return r}}
A.bi.prototype={
gm(){var t=this.d
return t==null?this.$ti.c.a(t):t},
l(){var t,s=this,r=s.a,q=r.gp(r)
if(s.b!==q)throw A.b(A.W(r))
t=s.c
if(t>=q){s.d=null
return!1}s.d=r.E(0,t);++s.c
return!0}}
A.a8.prototype={
gq(a){var t=this.a
return new A.bj(t.gq(t),this.b,A.x(this).i("bj<1,2>"))}}
A.aA.prototype={$ik:1}
A.bj.prototype={
l(){var t=this,s=t.b
if(s.l()){t.a=t.c.$1(s.gm())
return!0}t.a=null
return!1},
gm(){var t=this.a
return t==null?this.$ti.y[1].a(t):t}}
A.i.prototype={
gp(a){return J.ea(this.a)},
E(a,b){return this.b.$1(J.e9(this.a,b))}}
A.aK.prototype={}
A.ci.prototype={
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
A.aH.prototype={
j(a){return"Null check operator used on a null value"}}
A.bd.prototype={
j(a){var t,s=this,r="NoSuchMethodError: method not found: '",q=s.b
if(q==null)return"NoSuchMethodError: "+s.a
t=s.c
if(t==null)return r+q+"' ("+s.a+")"
return r+q+"' on '"+t+"' ("+s.a+")"}}
A.bu.prototype={
j(a){var t=this.a
return t.length===0?"Error":"Error: "+t}}
A.ca.prototype={
j(a){return"Throw of null ('"+(this.a===null?"null":"undefined")+"' from JavaScript)"}}
A.a4.prototype={
j(a){var t=this.constructor,s=t==null?null:t.name
return"Closure '"+A.dU(s==null?"unknown":s)+"'"},
gaI(){return this},
$C:"$1",
$R:1,
$D:null}
A.bH.prototype={$C:"$0",$R:0}
A.bI.prototype={$C:"$2",$R:2}
A.cg.prototype={}
A.cf.prototype={
j(a){var t=this.$static_name
if(t==null)return"Closure of unknown static method"
return"Closure '"+A.dU(t)+"'"}}
A.ay.prototype={
G(a,b){if(b==null)return!1
if(this===b)return!0
if(!(b instanceof A.ay))return!1
return this.$_target===b.$_target&&this.a===b.a},
gn(a){return(A.dR(this.a)^A.bm(this.$_target))>>>0},
j(a){return"Closure '"+this.$_name+"' of "+("Instance of '"+A.bn(this.a)+"'")}}
A.bp.prototype={
j(a){return"RuntimeError: "+this.a}}
A.L.prototype={
gp(a){return this.a},
gI(a){return this.a===0},
gJ(){return new A.N(this,A.x(this).i("N<1>"))},
h(a,b){var t,s,r,q,p=null
if(typeof b=="string"){t=this.b
if(t==null)return p
s=t[b]
r=s==null?p:s.b
return r}else if(typeof b=="number"&&(b&0x3fffffff)===b){q=this.c
if(q==null)return p
s=q[b]
r=s==null?p:s.b
return r}else return this.aA(b)},
aA(a){var t,s,r=this.d
if(r==null)return null
t=r[this.ab(a)]
s=this.ac(t,a)
if(s<0)return null
return t[s].b},
B(a,b,c){var t,s,r=this
if(typeof b=="string"){t=r.b
r.a4(t==null?r.b=r.a_():t,b,c)}else if(typeof b=="number"&&(b&0x3fffffff)===b){s=r.c
r.a4(s==null?r.c=r.a_():s,b,c)}else r.aB(b,c)},
aB(a,b){var t,s,r,q=this,p=q.d
if(p==null)p=q.d=q.a_()
t=q.ab(a)
s=p[t]
if(s==null)p[t]=[q.a0(a,b)]
else{r=q.ac(s,a)
if(r>=0)s[r].b=b
else s.push(q.a0(a,b))}},
H(a,b){var t=this,s=t.e,r=t.r
while(s!=null){b.$2(s.a,s.b)
if(r!==t.r)throw A.b(A.W(t))
s=s.c}},
a4(a,b,c){var t=a[b]
if(t==null)a[b]=this.a0(b,c)
else t.b=c},
a0(a,b){var t=this,s=new A.c7(a,b)
if(t.e==null)t.e=t.f=s
else t.f=t.f.c=s;++t.a
t.r=t.r+1&1073741823
return s},
ab(a){return J.bG(a)&1073741823},
ac(a,b){var t,s
if(a==null)return-1
t=a.length
for(s=0;s<t;++s)if(J.cD(a[s].a,b))return s
return-1},
j(a){return A.db(this)},
a_(){var t=Object.create(null)
t["<non-identifier-key>"]=t
delete t["<non-identifier-key>"]
return t}}
A.c7.prototype={}
A.N.prototype={
gp(a){return this.a.a},
gI(a){return this.a.a===0},
gq(a){var t=this.a
return new A.bh(t,t.r,t.e)}}
A.bh.prototype={
gm(){return this.d},
l(){var t,s=this,r=s.a
if(s.b!==r.r)throw A.b(A.W(r))
t=s.c
if(t==null){s.d=null
return!1}else{s.d=t.a
s.c=t.c
return!0}}}
A.M.prototype={
gq(a){var t=this.a
return new A.bg(t,t.r,t.e,this.$ti.i("bg<1,2>"))}}
A.bg.prototype={
gm(){var t=this.d
t.toString
return t},
l(){var t,s=this,r=s.a
if(s.b!==r.r)throw A.b(A.W(r))
t=s.c
if(t==null){s.d=null
return!1}else{s.d=new A.O(t.a,t.b,s.$ti.i("O<1,2>"))
s.c=t.c
return!0}}}
A.bU.prototype={
j(a){return"RegExp/"+this.a+"/"+this.b.flags},
aw(a){var t=this.b.exec(a)
if(t==null)return null
return new A.cq(t)}}
A.cq.prototype={}
A.F.prototype={
i(a){return A.ct(v.typeUniverse,this,a)},
M(a){return A.f6(v.typeUniverse,this,a)}}
A.bx.prototype={}
A.cr.prototype={
j(a){return A.y(this.a,null)}}
A.bw.prototype={
j(a){return this.a}}
A.aS.prototype={}
A.ac.prototype={
gq(a){var t=this,s=new A.au(t,t.r,A.x(t).i("au<1>"))
s.c=t.e
return s},
N(a,b){var t,s,r=this
if(typeof b=="string"&&b!=="__proto__"){t=r.b
return r.a5(t==null?r.b=A.cN():t,b)}else if(typeof b=="number"&&(b&1073741823)===b){s=r.c
return r.a5(s==null?r.c=A.cN():s,b)}else return r.ak(b)},
ak(a){var t,s,r=this,q=r.d
if(q==null)q=r.d=A.cN()
t=r.al(a)
s=q[t]
if(s==null)q[t]=[r.X(a)]
else{if(r.am(s,a)>=0)return!1
s.push(r.X(a))}return!0},
a5(a,b){if(a[b]!=null)return!1
a[b]=this.X(b)
return!0},
X(a){var t=this,s=new A.cp(a)
if(t.e==null)t.e=t.f=s
else t.f=t.f.b=s;++t.a
t.r=t.r+1&1073741823
return s},
al(a){return J.bG(a)&1073741823},
am(a,b){var t,s
if(a==null)return-1
t=a.length
for(s=0;s<t;++s)if(J.cD(a[s].a,b))return s
return-1}}
A.cp.prototype={}
A.au.prototype={
gm(){var t=this.d
return t==null?this.$ti.c.a(t):t},
l(){var t=this,s=t.c,r=t.a
if(t.b!==r.r)throw A.b(A.W(r))
else if(s==null){t.d=null
return!1}else{t.d=s.a
t.c=s.b
return!0}}}
A.c8.prototype={
$2(a,b){this.a.B(0,this.b.a(a),this.c.a(b))},
$S:5}
A.B.prototype={
H(a,b){var t,s,r,q
for(t=this.gJ(),t=t.gq(t),s=A.x(this).i("B.V");t.l();){r=t.gm()
q=this.h(0,r)
b.$2(r,q==null?s.a(q):q)}},
gp(a){var t=this.gJ()
return t.gp(t)},
gI(a){var t=this.gJ()
return t.gI(t)},
j(a){return A.db(this)},
$if:1}
A.c9.prototype={
$2(a,b){var t,s=this.a
if(!s.a)this.b.a+=", "
s.a=!1
s=this.b
t=A.j(a)
s.a=(s.a+=t)+": "
t=A.j(b)
s.a+=t},
$S:2}
A.as.prototype={
j(a){return A.d6(this,"{","}")},
$ik:1}
A.aR.prototype={}
A.by.prototype={
h(a,b){var t,s=this.b
if(s==null)return this.c.h(0,b)
else if(typeof b!="string")return null
else{t=s[b]
return typeof t=="undefined"?this.an(b):t}},
gp(a){return this.b==null?this.c.a:this.R().length},
gI(a){return this.gp(0)===0},
gJ(){if(this.b==null){var t=this.c
return new A.N(t,A.x(t).i("N<1>"))}return new A.bz(this)},
H(a,b){var t,s,r,q,p=this
if(p.b==null)return p.c.H(0,b)
t=p.R()
for(s=0;s<t.length;++s){r=t[s]
q=p.b[r]
if(typeof q=="undefined"){q=A.cv(p.a[r])
p.b[r]=q}b.$2(r,q)
if(t!==p.c)throw A.b(A.W(p))}},
R(){var t=this.c
if(t==null)t=this.c=A.d(Object.keys(this.a),u.s)
return t},
an(a){var t
if(!Object.prototype.hasOwnProperty.call(this.a,a))return null
t=A.cv(this.a[a])
return this.b[a]=t}}
A.bz.prototype={
gp(a){return this.a.gp(0)},
E(a,b){var t=this.a
return t.b==null?t.gJ().E(0,b):t.R()[b]},
gq(a){var t=this.a
if(t.b==null){t=t.gJ()
t=t.gq(t)}else{t=t.R()
t=new J.ak(t,t.length,A.v(t).i("ak<1>"))}return t}}
A.b0.prototype={}
A.b2.prototype={}
A.aF.prototype={
j(a){var t=A.b4(this.a)
return(this.b!=null?"Converting object to an encodable object failed:":"Converting object did not return an encodable object:")+" "+t}}
A.be.prototype={
j(a){return"Cyclic error in JSON stringify"}}
A.c4.prototype={
u(a,b){var t=A.fK(a,this.gau().a)
return t},
v(a,b){var t=A.eT(a,this.gav().b,null)
return t},
gav(){return B.N},
gau(){return B.M}}
A.c6.prototype={}
A.c5.prototype={}
A.cn.prototype={
ah(a){var t,s,r,q,p,o,n=a.length
for(t=this.c,s=0,r=0;r<n;++r){q=a.charCodeAt(r)
if(q>92){if(q>=55296){p=q&64512
if(p===55296){o=r+1
o=!(o<n&&(a.charCodeAt(o)&64512)===56320)}else o=!1
if(!o)if(p===56320){p=r-1
p=!(p>=0&&(a.charCodeAt(p)&64512)===55296)}else p=!1
else p=!0
if(p){if(r>s)t.a+=B.e.L(a,s,r)
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
t.a+=p}}continue}if(q<32){if(r>s)t.a+=B.e.L(a,s,r)
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
break}}else if(q===34||q===92){if(r>s)t.a+=B.e.L(a,s,r)
s=r+1
p=A.p(92)
t.a+=p
p=A.p(q)
t.a+=p}}if(s===0)t.a+=a
else if(s<n)t.a+=B.e.L(a,s,n)},
W(a){var t,s,r,q
for(t=this.a,s=t.length,r=0;r<s;++r){q=t[r]
if(a==null?q==null:a===q)throw A.b(new A.be(a,null))}t.push(a)},
U(a){var t,s,r,q,p=this
if(p.ag(a))return
p.W(a)
try{t=p.b.$1(a)
if(!p.ag(t)){r=A.da(a,null,p.ga6())
throw A.b(r)}p.a.pop()}catch(q){s=A.cW(q)
r=A.da(a,s,p.ga6())
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
r.aG(a)
r.a.pop()
return!0}else if(a instanceof A.B){r.W(a)
s=r.aH(a)
r.a.pop()
return s}else return!1},
aG(a){var t,s=this.c
s.a+="["
if(a.length!==0){this.U(a[0])
for(t=1;t<a.length;++t){s.a+=","
this.U(a[t])}}s.a+="]"},
aH(a){var t,s,r,q,p,o=this,n={}
if(a.gI(a)){o.c.a+="{}"
return!0}t=a.gp(a)*2
s=A.eD(t,null,u.X)
r=n.a=0
n.b=!0
a.H(0,new A.co(n,s))
if(!n.b)return!1
q=o.c
q.a+="{"
for(p='"';r<t;r+=2,p=',"'){q.a+=p
o.ah(A.dA(s[r]))
q.a+='":'
o.U(s[r+1])}q.a+="}"
return!0}}
A.co.prototype={
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
A.cm.prototype={
ga6(){var t=this.c.a
return t.charCodeAt(0)==0?t:t}}
A.bQ.prototype={
$0(){var t=this
return A.bF(A.cE("("+t.a+", "+t.b+", "+t.c+", "+t.d+", "+t.e+", "+t.f+", "+t.r+", "+t.w+")"))},
$S:6}
A.z.prototype={
V(a){var t=1000,s=B.a.K(a,t),r=B.a.t(a-s,t),q=this.b+s,p=B.a.K(q,t),o=this.c
return new A.z(A.d4(this.a+B.a.t(q-p,t)+r,p,o),p,o)},
a9(a){return A.eq(0,this.b-a.b,this.a-a.a)},
G(a,b){if(b==null)return!1
return b instanceof A.z&&this.a===b.a&&this.b===b.b&&this.c===b.c},
gn(a){return A.eG(this.a,this.b)},
ad(a){var t=this.a,s=a.a
if(t<=s)t=t===s&&this.b>a.b
else t=!0
return t},
k(a,b){var t=B.a.k(this.a,b.a)
if(t!==0)return t
return B.a.k(this.b,b.b)},
j(a){var t=this,s=A.d3(A.H(t)),r=A.J(A.Q(t)),q=A.J(A.ar(t)),p=A.J(A.dd(t)),o=A.J(A.df(t)),n=A.J(A.dg(t)),m=A.bR(A.de(t)),l=t.b,k=l===0?"":A.bR(l)
l=s+"-"+r
if(t.c)return l+"-"+q+" "+p+":"+o+":"+n+"."+m+k+"Z"
else return l+"-"+q+" "+p+":"+o+":"+n+"."+m+k},
T(){var t=this,s=A.H(t)>=-9999&&A.H(t)<=9999?A.d3(A.H(t)):A.eo(A.H(t)),r=A.J(A.Q(t)),q=A.J(A.ar(t)),p=A.J(A.dd(t)),o=A.J(A.df(t)),n=A.J(A.dg(t)),m=A.bR(A.de(t)),l=t.b,k=l===0?"":A.bR(l)
l=s+"-"+r
if(t.c)return l+"-"+q+"T"+p+":"+o+":"+n+"."+m+k+"Z"
else return l+"-"+q+"T"+p+":"+o+":"+n+"."+m+k}}
A.bS.prototype={
$1(a){if(a==null)return 0
return A.bE(a)},
$S:3}
A.bT.prototype={
$1(a){var t,s,r
if(a==null)return 0
for(t=a.length,s=0,r=0;r<6;++r){s*=10
if(r<t)s+=a.charCodeAt(r)^48}return s},
$S:3}
A.b3.prototype={
G(a,b){if(b==null)return!1
return b instanceof A.b3&&this.a===b.a},
gn(a){return B.a.gn(this.a)},
k(a,b){return B.a.k(this.a,b.a)},
j(a){var t,s,r,q,p,o=this.a,n=B.a.t(o,36e8),m=o%36e8
if(o<0){n=0-n
o=0-m
t="-"}else{o=m
t=""}s=B.a.t(o,6e7)
o%=6e7
r=s<10?"0":""
q=B.a.t(o,1e6)
p=q<10?"0":""
return t+n+":"+r+s+":"+p+q+"."+B.e.aC(B.a.j(o%1e6),6,"0")}}
A.ck.prototype={
j(a){return this.D()}}
A.h.prototype={}
A.aZ.prototype={
j(a){var t=this.a
if(t!=null)return"Assertion failed: "+A.b4(t)
return"Assertion failed"}}
A.aO.prototype={}
A.V.prototype={
gZ(){return"Invalid argument"+(!this.a?"(s)":"")},
gY(){return""},
j(a){var t=this,s=t.c,r=s==null?"":" ("+s+")",q=t.d,p=q==null?"":": "+q,o=t.gZ()+r+p
if(!t.a)return o
return o+t.gY()+": "+A.b4(t.ga1())},
ga1(){return this.b}}
A.bo.prototype={
ga1(){return this.b},
gZ(){return"RangeError"},
gY(){var t,s=this.e,r=this.f
if(s==null)t=r!=null?": Not less than or equal to "+A.j(r):""
else if(r==null)t=": Not greater than or equal to "+A.j(s)
else if(r>s)t=": Not in inclusive range "+A.j(s)+".."+A.j(r)
else t=r<s?": Valid value range is empty":": Only valid value is "+A.j(s)
return t}}
A.b7.prototype={
ga1(){return this.b},
gZ(){return"RangeError"},
gY(){if(this.b<0)return": index must not be negative"
var t=this.f
if(t===0)return": no indices are valid"
return": index should be less than "+t}}
A.aP.prototype={
j(a){return"Unsupported operation: "+this.a}}
A.bq.prototype={
j(a){return"Bad state: "+this.a}}
A.b1.prototype={
j(a){var t=this.a
if(t==null)return"Concurrent modification during iteration."
return"Concurrent modification during iteration: "+A.b4(t)+"."}}
A.bk.prototype={
j(a){return"Out of Memory"},
$ih:1}
A.aL.prototype={
j(a){return"Stack Overflow"},
$ih:1}
A.cl.prototype={
j(a){return"Exception: "+this.a}}
A.b5.prototype={
j(a){var t=this.a,s=""!==t?"FormatException: "+t:"FormatException",r=this.b
if(typeof r=="string"){if(r.length>78)r=B.e.L(r,0,75)+"..."
return s+"\n"+r}else return s}}
A.l.prototype={
gp(a){var t,s=this.gq(this)
for(t=0;s.l();)++t
return t},
E(a,b){var t,s
A.eM(b,"index")
t=this.gq(this)
for(s=b;t.l();){if(s===0)return t.gm();--s}throw A.b(A.er(b,b-s,this,"index"))},
j(a){return A.es(this,"(",")")}}
A.O.prototype={
j(a){return"MapEntry("+A.j(this.a)+": "+A.j(this.b)+")"}}
A.aG.prototype={
gn(a){return A.c.prototype.gn.call(this,0)},
j(a){return"null"}}
A.c.prototype={$ic:1,
G(a,b){return this===b},
gn(a){return A.bm(this)},
j(a){return"Instance of '"+A.bn(this)+"'"},
gF(a){return A.hl(this)},
toString(){return this.j(this)}}
A.aM.prototype={
j(a){var t=this.a
return t.charCodeAt(0)==0?t:t}}
A.aI.prototype={
D(){return"Plan."+this.b}}
A.a5.prototype={
D(){return"Feature."+this.b}}
A.am.prototype={}
A.E.prototype={}
A.bJ.prototype={}
A.bK.prototype={
$2(a,b){var t,s=b.b.c
if(s==null)s=0
t=a.b.c
return B.d.k(s,t==null?0:t)},
$S:1}
A.bL.prototype={
$2(a,b){return B.a.k(b.c,a.c)},
$S:1}
A.bM.prototype={
$2(a,b){return B.a.k(a.c,b.c)},
$S:1}
A.bN.prototype={
$2(a,b){return B.a.k(b.d,a.d)},
$S:1}
A.bO.prototype={
$2(a,b){return B.a.k(b.c,a.c)},
$S:1}
A.bP.prototype={
$2(a,b){var t,s=b.a.x
s.toString
t=a.a.x
t.toString
return s.k(0,t)},
$S:1}
A.K.prototype={
D(){return"GoalPlanMode."+this.b}}
A.aB.prototype={}
A.aa.prototype={
D(){return"ProjectionKind."+this.b}}
A.X.prototype={}
A.a9.prototype={}
A.u.prototype={}
A.bs.prototype={}
A.bc.prototype={}
A.bW.prototype={
$2(a,b){var t,s,r=a.x
r.toString
t=b.x
t.toString
s=r.k(0,t)
return s!==0?s:B.e.k(a.a,b.a)},
$S:4}
A.bX.prototype={
$1(a){return B.e.P(a)},
$S:0}
A.bZ.prototype={
$1(a){var t=A.x(a).i("M<1,2>")
t=A.eF(new A.M(a,t),new A.c_(),t.i("l.E"),u.M)
t=A.A(t,A.x(t).i("l.E"))
B.c.A(t,new A.c0())
return t},
$S:7}
A.c_.prototype={
$1(a){var t=a.b
return new A.u(a.a,t.a,t.b,t.c)},
$S:8}
A.c0.prototype={
$2(a,b){var t=B.d.k(b.b,a.b)
return t!==0?t:B.e.k(a.a,b.a)},
$S:9}
A.bY.prototype={
$2(a,b){return a+b},
$S:10}
A.aQ.prototype={}
A.T.prototype={
N(a,b){this.a+=b;++this.b
if(b>0)++this.c}}
A.an.prototype={}
A.c2.prototype={}
A.c3.prototype={
$2(a,b){var t,s,r=a.x
r.toString
t=b.x
t.toString
s=r.k(0,t)
return s!==0?s:B.e.k(a.a,b.a)},
$S:4}
A.P.prototype={}
A.bl.prototype={}
A.cc.prototype={
$2(a,b){var t=B.d.k(b.c,a.c)
return t!==0?t:B.e.k(a.b,b.b)},
$S:11}
A.cK.prototype={}
A.ce.prototype={}
A.aN.prototype={
D(){return"TradeQuality."+this.b}}
A.cM.prototype={}
A.at.prototype={
D(){return"TradeResult."+this.b}}
A.ch.prototype={}
A.I.prototype={
D(){return"ChecklistItem."+this.b}}
A.br.prototype={}
A.a_.prototype={}
A.ab.prototype={
D(){return"TradeStatus."+this.b}}
A.cz.prototype={
$1(a){return a.b===this.a.h(0,"mode")},
$S:12}
A.cA.prototype={
$0(){return B.j},
$S:13}
A.cB.prototype={
$2(a,b){var t,s=new A.cC(b)
if(typeof s=="function")A.bF(A.cE("Attempting to rewrap a JS function."))
t=function(c,d){return function(e){return c(d,e,arguments.length)}}(A.fk,s)
t[$.cX()]=s
this.a[a]=t},
$S:14}
A.cC.prototype={
$1(a){return this.a.$1(a)},
$S:0};(function aliases(){var t=J.Y.prototype
t.aj=t.j})();(function installTearOffs(){var t=hunkHelpers._static_2,s=hunkHelpers._static_1
t(J,"fv","eu",15)
s(A,"hd","fm",16)
s(A,"dK","fL",17)
s(A,"dL","bB",18)
s(A,"aX","fI",19)
s(A,"fX","fU",0)
s(A,"h7","hz",0)
s(A,"fZ","hf",0)
s(A,"h4","hw",0)
s(A,"h3","hv",0)
s(A,"h8","hD",0)
s(A,"h5","hx",0)
s(A,"h6","hy",0)
s(A,"h0","hn",0)
s(A,"h1","hs",0)
s(A,"h_","hg",0)
s(A,"h2","hu",0)
s(A,"fY","h9",0)})();(function inheritance(){var t=hunkHelpers.inherit,s=hunkHelpers.inheritMany
t(A.c,null)
s(A.c,[A.cG,J.b8,A.aK,J.ak,A.h,A.cd,A.l,A.bi,A.bj,A.ci,A.ca,A.a4,A.B,A.c7,A.bh,A.bg,A.bU,A.cq,A.F,A.bx,A.cr,A.as,A.cp,A.au,A.b0,A.b2,A.cn,A.z,A.b3,A.ck,A.bk,A.aL,A.cl,A.b5,A.O,A.aG,A.aM,A.am,A.E,A.bJ,A.aB,A.X,A.a9,A.u,A.bs,A.bc,A.aQ,A.T,A.an,A.c2,A.P,A.bl,A.cK,A.ce,A.cM,A.ch,A.br,A.a_])
s(J.b8,[J.ba,J.aD,J.aq,J.ao,J.a6])
s(J.aq,[J.Y,J.e])
s(J.Y,[J.cb,J.a0,J.aE])
t(J.b9,A.aK)
t(J.bV,J.e)
s(J.ao,[J.aC,J.bb])
s(A.h,[A.bf,A.aO,A.bd,A.bu,A.bp,A.bw,A.aF,A.aZ,A.V,A.aP,A.bq,A.b1])
s(A.l,[A.k,A.a8])
s(A.k,[A.m,A.N,A.M])
t(A.aA,A.a8)
s(A.m,[A.i,A.bz])
t(A.aH,A.aO)
s(A.a4,[A.bH,A.bI,A.cg,A.bS,A.bT,A.bX,A.bZ,A.c_,A.cz,A.cC])
s(A.cg,[A.cf,A.ay])
s(A.B,[A.L,A.by])
t(A.aS,A.bw)
t(A.aR,A.as)
t(A.ac,A.aR)
s(A.bI,[A.c8,A.c9,A.co,A.bK,A.bL,A.bM,A.bN,A.bO,A.bP,A.bW,A.c0,A.bY,A.c3,A.cc,A.cB])
t(A.be,A.aF)
t(A.c4,A.b0)
s(A.b2,[A.c6,A.c5])
t(A.cm,A.cn)
s(A.bH,[A.bQ,A.cA])
s(A.V,[A.bo,A.b7])
s(A.ck,[A.aI,A.a5,A.K,A.aa,A.aN,A.at,A.I,A.ab])})()
var v={G:typeof self!="undefined"?self:globalThis,typeUniverse:{eC:new Map(),tR:{},eT:{},tPV:{},sEA:[]},mangledGlobalNames:{w:"int",D:"double",dQ:"num",a:"String",aW:"bool",aG:"Null",Z:"List",c:"Object",f:"Map",ap:"JSObject"},mangledNames:{},types:["a(a)","w(E,E)","~(c?,c?)","w(a?)","w(a_,a_)","~(@,@)","0&()","Z<u>(f<a,T>)","u(O<a,T>)","w(u,u)","D(D,D)","w(P,P)","aW(K)","K()","~(a,a(a))","w(@,@)","@(@)","f<a,c?>(a9)","f<a,c?>?(u?)","f<a,c?>(E)"],arrayRti:Symbol("$ti")}
A.f5(v.typeUniverse,JSON.parse('{"cb":"Y","a0":"Y","aE":"Y","ba":{"aW":[],"R":[]},"aD":{"R":[]},"aq":{"ap":[]},"Y":{"ap":[]},"e":{"Z":["1"],"k":["1"],"ap":[]},"b9":{"aK":[]},"bV":{"e":["1"],"Z":["1"],"k":["1"],"ap":[]},"ao":{"D":[]},"aC":{"D":[],"w":[],"R":[]},"bb":{"D":[],"R":[]},"a6":{"a":[],"R":[]},"bf":{"h":[]},"k":{"l":["1"]},"m":{"k":["1"],"l":["1"]},"a8":{"l":["2"],"l.E":"2"},"aA":{"a8":["1","2"],"k":["2"],"l":["2"],"l.E":"2"},"i":{"m":["2"],"k":["2"],"l":["2"],"m.E":"2","l.E":"2"},"aH":{"h":[]},"bd":{"h":[]},"bu":{"h":[]},"bp":{"h":[]},"L":{"B":["1","2"],"f":["1","2"],"B.V":"2"},"N":{"k":["1"],"l":["1"],"l.E":"1"},"M":{"k":["O<1,2>"],"l":["O<1,2>"],"l.E":"O<1,2>"},"bw":{"h":[]},"aS":{"h":[]},"ac":{"as":["1"],"k":["1"]},"B":{"f":["1","2"]},"as":{"k":["1"]},"aR":{"as":["1"],"k":["1"]},"by":{"B":["a","@"],"f":["a","@"],"B.V":"@"},"bz":{"m":["a"],"k":["a"],"l":["a"],"m.E":"a","l.E":"a"},"aF":{"h":[]},"be":{"h":[]},"Z":{"k":["1"]},"aZ":{"h":[]},"aO":{"h":[]},"V":{"h":[]},"bo":{"h":[]},"b7":{"h":[]},"aP":{"h":[]},"bq":{"h":[]},"b1":{"h":[]},"bk":{"h":[]},"aL":{"h":[]}}'))
A.f4(v.typeUniverse,JSON.parse('{"k":1,"bh":1,"aR":1,"b0":2,"b2":2}'))
var u=(function rtii(){var t=A.a3
return{k:t("z"),G:t("E"),Q:t("k<@>"),I:t("an"),C:t("h"),Z:t("hI"),g:t("e<z>"),Y:t("e<E>"),t:t("e<an>"),x:t("e<f<a,c>>"),p:t("e<f<a,a>>"),o:t("e<P>"),s:t("e<a>"),O:t("e<br>"),J:t("e<a_>"),n:t("e<D>"),b:t("e<@>"),T:t("aD"),m:t("ap"),L:t("aE"),A:t("Z<f<a,c?>>"),j:t("Z<@>"),P:t("f<a,@>"),f:t("f<@,@>"),a:t("aG"),K:t("c"),R:t("P"),_:t("a9"),U:t("hJ"),N:t("a"),M:t("u"),l:t("R"),B:t("a0"),W:t("aQ"),V:t("T"),y:t("aW"),i:t("D"),z:t("@"),S:t("w"),c:t("d5<aG>?"),D:t("ap?"),X:t("c?"),v:t("a?"),u:t("aW?"),w:t("D?"),E:t("w?"),F:t("dQ?"),H:t("dQ")}})();(function constants(){var t=hunkHelpers.makeConstList
B.J=J.b8.prototype
B.c=J.e.prototype
B.a=J.aC.prototype
B.d=J.ao.prototype
B.e=J.a6.prototype
B.K=J.aq.prototype
B.t=function getTagFallback(o) {
  var s = Object.prototype.toString.call(o);
  return s.substring(8, s.length - 1);
}
B.b=new A.c4()
B.u=new A.bk()
B.a8=new A.cd()
B.U=new A.aI(1,"pro")
B.B=new A.am(B.U,null)
B.p=new A.aI(2,"free")
B.C=new A.am(B.p,0)
B.i=new A.am(B.p,null)
B.j=new A.K(0,"targetToMonthly")
B.k=new A.K(1,"monthlyToTarget")
B.X=new A.aa(1,"alreadyThere")
B.H=new A.X(B.X,0,!1,null,null,null,null,0)
B.Z=new A.aa(4,"noCapital")
B.I=new A.X(B.Z,0,!1,null,null,null,null,0)
B.m=t([],A.a3("e<a9>"))
B.n=t([],A.a3("e<u>"))
B.L=new A.bc(null,0,0,null,null,null,0,null,null,B.m,B.m,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,B.n,null,null,B.n,null,null)
B.M=new A.c5(null)
B.N=new A.c6(null)
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
B.o=new A.aI(0,"trial")
B.T=t([],u.o)
B.V=new A.bl(0,null,null,B.T)
B.W=new A.aa(0,"reachable")
B.q=new A.aa(2,"notEnoughHistory")
B.Y=new A.aa(3,"noEdge")
B.a_=new A.aN(0,"good")
B.a0=new A.aN(1,"warning")
B.a1=new A.aN(2,"bad")
B.r=new A.at(0,"open")
B.a2=new A.at(1,"win")
B.a3=new A.at(2,"loss")
B.a4=new A.at(3,"breakeven")
B.a7=A.hE("c")})();(function staticFields(){$.af=A.d([],A.a3("e<c>"))
$.dc=null
$.d0=null
$.d_=null})();(function lazyInitializers(){var t=hunkHelpers.lazyFinal
t($,"hG","dV",()=>A.dO("_$dart_dartClosure"))
t($,"hF","cX",()=>A.dO("_$dart_dartClosure_dartJSInterop"))
t($,"hV","e7",()=>A.d([new J.b9()],A.a3("e<aK>")))
t($,"hK","dX",()=>A.S(A.cj({
toString:function(){return"$receiver$"}})))
t($,"hL","dY",()=>A.S(A.cj({$method$:null,
toString:function(){return"$receiver$"}})))
t($,"hM","dZ",()=>A.S(A.cj(null)))
t($,"hN","e_",()=>A.S(function(){var $argumentsExpr$="$arguments$"
try{null.$method$($argumentsExpr$)}catch(s){return s.message}}()))
t($,"hQ","e2",()=>A.S(A.cj(void 0)))
t($,"hR","e3",()=>A.S(function(){var $argumentsExpr$="$arguments$"
try{(void 0).$method$($argumentsExpr$)}catch(s){return s.message}}()))
t($,"hP","e1",()=>A.S(A.dm(null)))
t($,"hO","e0",()=>A.S(function(){try{null.$method$}catch(s){return s.message}}()))
t($,"hT","e5",()=>A.S(A.dm(void 0)))
t($,"hS","e4",()=>A.S(function(){try{(void 0).$method$}catch(s){return s.message}}()))
t($,"hH","dW",()=>A.eO("^([+-]?\\d{4,6})-?(\\d\\d)-?(\\d\\d)(?:[ T](\\d\\d)(?::?(\\d\\d)(?::?(\\d\\d)(?:[.,](\\d+))?)?)?( ?[zZ]| ?([-+])(\\d\\d)(?::?(\\d\\d))?)?)?$"))
t($,"hU","e6",()=>A.dR(B.a7))})();(function nativeSupport(){!function(){var t=function(a){var n={}
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
var t=A.hq
if(typeof dartMainRunner==="function"){dartMainRunner(t,[])}else{t([])}})})()
// The bundle above ran its main() during module evaluation and put the API
// on globalThis. Re-exported here so importers get a value rather than
// reaching for a global — and so the bundler keeps the file.
export const radarCalc = globalThis.radarCalc;
