import { node_plugins } from 'engine/registry';

import Tween from './Tween';
import TweenManager from './TweenManager';

node_plugins.TweenManager = TweenManager;

export default {
    Tween,
    TweenManager,
}
