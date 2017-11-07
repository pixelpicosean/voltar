import { Resource } from 'resource-loader';
import { Data } from '../core/scene/coa_sprite/CoaSprite';
import { Model } from '../core/scene/coa_sprite/Model';

const EXTENSION = 'scon';
Resource.TYPE.SCON = 10;

export default function()
{
    return function(resource, next)
    {
        // skip if no data or its not scon
        if (!resource.data || resource.extension !== EXTENSION)
        {
            return next();
        }
        // Data file is already loaded
        if (Data[resource.url] || Data[resource.name]) {
            return next();
        }

        const model = new Model(JSON.parse(resource.data));

        // Write model back to resource as its data
        resource.type = Resource.TYPE.SCON;
        resource.data = model;

        // Save to model cache
        Data[resource.url] = Data[resource.name] = model;

        return next();
    };
}
