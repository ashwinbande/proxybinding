'use strict';

function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object;
}

let dep = null;

function getPath(path, prop) {
  if (path) return `${path}.${prop}`;
  return prop;
}

function changeComputed(path) {
  for (let computedProp in this.$dependencies) {
    if (this.$dependencies[computedProp].has(path)) {
      const oldVal = this.$cache[computedProp];
      this.$cache[computedProp] = undefined;
      const newVal = this[computedProp];
      propagateChange.call(this, computedProp, newVal);
      changeComputed.call(this, computedProp);
      executeWatch.call(this, computedProp, newVal, oldVal);
    }
  }
}

function executeWatch(path, newVal, oldVal) {
  if (this.$watch[path]) {
    this.$watch[path].call(this, newVal, oldVal);
  }
}

function propagateChange(path, newValue) {
  if (this.$bindings[path]) this.$bindings[path].forEach(element => element.value = newValue);
}

function setData(target, object, self, path) {
  for (let prop in object) {
    Object.defineProperty(target, prop, {
      get() {
        if (isObject(object[prop])) return setData({}, object[prop], self, getPath(path, prop));
        else {
          if (dep) self.$dependencies[dep].add(getPath(path, prop));
          return object[prop];
        }
      },
      set(newVal) {
        const oldVal = object[prop];
        object[prop] = newVal;
        propagateChange.call(self, getPath(path, prop), newVal);
        changeComputed.call(self, getPath(path, prop));
        executeWatch.call(self, getPath(path, prop), newVal, oldVal);
      },
    });
  }
  return target;
}

function setComputed(target, object) {
  for (let prop in object) {
    target.$dependencies[prop] = new Set();
    Object.defineProperty(target, prop, {
      get() {
        if (dep) target.$dependencies[dep].add(prop);
        if (target.$cache[prop]) return target.$cache[prop];
        if (!dep) dep = prop;
        const func = object[prop].get || object[prop];
        target.$cache[prop] = func.call(target);
        dep = null;
        return target.$cache[prop]
      },
      set(val) {
        const func = object[prop].set;
        if (func) {
          func.call(target, val);
          target.$cache[prop] = undefined;
        }
      },
    });
  }
}

function getValue(path) {
  const arrayPath = path.split('.');
  return arrayPath.reduce((acc, str) => acc ? acc[str] : acc, this);
}

function setValue(path, value) {
  const arrayPath = path.split('.');
  const last = arrayPath.pop();
  const obj = arrayPath.reduce((acc, str) => acc ? acc[str] : acc, this);
  obj[last] = value;
}

function setBinding() {
  const elements = this.$parent.querySelectorAll('[data-bind]');
  elements.forEach(element => {
    const variable = element.dataset.bind;
    if (this.$bindings[variable]) this.$bindings[variable].push(element);
    else this.$bindings[variable] = [element];

    element.addEventListener('input', event => setValue.call(this, variable, event.target.value));
    element.value = getValue.call(this, variable);
  });
}

function setEvents() {
  const elements = this.$parent.querySelectorAll('*');
  console.log(elements);
  elements.forEach(element => element);
}

class Binding {
  constructor(obj) {
    setData(this, obj.data, this);
    setComputed(this, obj.computed);
    this.$watch = obj.watch;
    this.$methods = obj.methods;
    this.$parent = document.getElementById(obj.element);
    setBinding.call(this);
    setEvents.call(this);
  }
  $dependencies = {};
  $cache = {};
  $bindings = {};
}
