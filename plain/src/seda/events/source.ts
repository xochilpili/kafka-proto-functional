import { com, root } from '@engyalo/schemas';

const Domain = root.lookupEnum('com.yalo.schemas.events.common.Domain');

export const populateSource = (source: com.yalo.schemas.events.common.Metadata.ISource) => {
	source.domain = Domain.values.APPLICATIONS;
	source.service = 'workflows-manager';
	source.instance = 'workflows-manager-instance';
	source.address = 'workflows-manager-address';
};
