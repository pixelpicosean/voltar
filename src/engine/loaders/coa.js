import { resource_loader } from 'engine/dep/index';
import { Data } from 'engine/scene/coa_sprite/CoaSprite';
import { Model } from 'engine/scene/coa_sprite/Model';

const { Resource } = resource_loader;

const EXTENSION = 'scon';
Resource.TYPE.SCON = 10;

export default function () {
    return function (resource, next) {
        // skip if no data or its not scon
        if (!resource.data || resource.extension !== EXTENSION) {
            return next();
        }
        // Data file is already loaded
        if (Data[resource.url] || Data[resource.name]) {
            return next();
        }

        const data = validate_data(JSON.parse(resource.data));
        const model = new Model(data);

        // Write model back to resource as its data
        resource.type = Resource.TYPE.SCON;
        resource.data = model;

        // Save to model cache
        Data[resource.url] = Data[resource.name] = model;

        return next();
    };
}

function validate_data(data) {
    if (data.is_validated) {
        return data
    }

    // Invert the `pivot_y` of each file
    data.folder.forEach(folder => {
        folder.file.forEach(file => {
            file.pivot_y = 1 - file.pivot_y
        })
    })

    // Fix timeline keys
    data.entity.forEach(entity => {
        entity.animation.forEach(animation => {
            animation.timeline.forEach(timeline => {
                timeline.key.forEach(key => {
                    if (key.hasOwnProperty('object')) {
                        let obj = key.object
                        let res = Object.assign({}, obj)

                        // Negative the angle
                        if (obj.angle !== undefined) {
                            res.angle = -obj.angle
                        }

                        // Invert y
                        if (obj.y !== undefined) {
                            res.y = -obj.y
                        }

                        // Override with our new object
                        key.object = res
                    } else if (key.hasOwnProperty('bone')) {
                        let obj = key.bone
                        let res = Object.assign({}, obj)

                        if (obj.angle !== undefined) {
                            res.angle = -obj.angle
                        }

                        // Invert y
                        if (obj.y !== undefined) {
                            res.y = -obj.y
                        }

                        // Override with our new object
                        key.bone = res
                    }
                })
            })
        })
    })

    data.is_validated = true
    return data
}
