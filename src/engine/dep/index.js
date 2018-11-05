/// <reference path="./dep.d.ts" />

export { default as remove_items } from 'remove-array-items';

export { default as EventEmitter } from './EventEmitter';

export { default as Signal } from 'mini-signals';

import * as device_ns from 'ismobilejs';
export const device = device_ns;

import * as GL_ns from 'pixi-gl-core';
export const GL = GL_ns;

import * as resource_loader_ns from 'resource-loader';
export const resource_loader = resource_loader_ns;
export const ResourceLoader = resource_loader.default;
