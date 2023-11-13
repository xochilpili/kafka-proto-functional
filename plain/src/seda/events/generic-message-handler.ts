import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { ILogger, pinoLogger } from '../../logger';
import { com, root } from '@engyalo/schemas';

export class GenericEventHandler {
	private logger: ILogger = pinoLogger;

	async messageHandler<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void> {
		const type = payload?.value?.constructor?.name;
		switch (type) {
			case 'InterpreterProcessingAction': {
				const { source, webhookTrigger = null, campaignTrigger = null, whatsappInputMessage = null, yaloMessage = null } = payload.value as com.yalo.schemas.events.flow_builder.IInterpreterProcessingAction;
				const triggerSource = root.lookupEnum('com.yalo.schemas.events.flow_builder.InterpreterProcessingAction.TriggerSource');

				switch (source) {
					case triggerSource.values.CAMPAIGN_TRIGGER: {
						console.log('consumed campaignTrigger', campaignTrigger);
						break;
					}
					case triggerSource.values.WEBHOOK_TRIGGER: {
						console.log('consumed webhookTrigger', webhookTrigger);
						break;
					}
					case triggerSource.values.WHATSAPP_INPUT_MESSAGE: {
						const { botId, message, user, timestamp } = whatsappInputMessage;

						// Hndle Message Event

						const whatsInput = {
							botId: botId,
							provider: '',
							authorRole: '',
							responseChannel: 'hooksproxy',
							timestamp: timestamp.seconds,
							message: { ...this.translateWhatsappMessagetoType(message) },
							user: {
								...(user.profile && {
									profile: {
										name: user.profile?.name,
									},
									wa_id: user.waId,
								}),
							},
						};

						console.log('consumed whatsappInputMessage', whatsInput);
						break;
					}
					case triggerSource.values.YALO_MESSAGE: {
						console.log('consumed yaloMessage', yaloMessage);
						break;
					}
				}
			}

			/*
			case 'ErrorLog':
				const { ...rest } = value as T;
				GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			case 'YaloMessage':
				if (headers && (headers['x-message-status'] || headers['x-message-status'])) {
					const headerval = headers['x-message-status'].toString();
					if (headerval === 'Undelivered' || headerval === 'UnsentToProvider') {
						const { ...rest } = value as T;
						GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
					}
				}
				break;
			*/

			default:
				this.logger.error(`Unable to fetch eventType: ${type} payload: ${JSON.stringify(payload)}`);
				throw new Error(`Unable to find: ${type} message handler`);
		}
		return;
	}
	deadLetterHandler<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void> {
		const type = payload?.value?.constructor?.name;
		const { headers, value } = payload;
		switch (type) {
			case 'ErrorLog':
				const { ...rest } = value as T;
				this.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			case 'YaloMessage':
				if (headers[''] === 'x') {
					const { ...rest } = value as T;
					this.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				}
				break;
			default:
				this.logger.error(`Unable to fetch eventType: ${type} payload: ${JSON.stringify(payload)}`);
				throw new Error(`Unable to find: ${type} message handler`);
		}
		return;
	}

	private translateWhatsappMessagetoType = (message: com.yalo.schemas.events.flow_builder.WhatsAppInputMessage.IInputMessage): any => {
		return {
			from: message.from,
			id: message.id,
			type: message.type,
			timestamp: message.timestamp.seconds,
			...(message.text && { text: { body: message.text?.body } }),
			...(message.location && {
				location: {
					latitude: message.location?.latitude,
					longitude: message.location?.longitude,
				},
			}),
			...(message.button && {
				button: {
					text: message.button?.text,
				},
			}),
			...(message.image && {
				image: {
					id: message.image.id,
					mime_type: message.image?.mimeType,
					sha256: message.image?.sha256,
				},
			}),
			...(message.voice && {
				voice: {
					id: message.voice?.id,
					mime_type: message.voice?.mimeType,
					sha256: message.voice?.sha256,
				},
			}),
			...(message.audio && {
				audio: {
					id: message.audio?.id,
					mime_type: message.audio?.mimeType,
					sha256: message.audio?.sha256,
				},
			}),
			...(message.video && {
				video: {
					id: message.video?.id,
					mime_type: message.video?.mimeType,
					sha256: message.video?.sha256,
				},
			}),
			...(message.sticker && {
				sticker: {
					id: message.sticker?.id,
					mime_type: message.sticker?.mimeType,
					sha256: message.sticker?.sha256,
				},
			}),
			...(message.document && {
				document: {
					id: message.document?.id,
					caption: message.document?.caption,
					filename: message.document?.filename,
					mime_type: message.document?.mimeType,
					sha256: message.document?.sha256,
				},
			}),
			...(message.context && {
				context: {
					referred_product: {
						catalog_id: message.context?.referredProduct?.catalogId,
						product_retailer_id: message.context?.referredProduct?.productRetailerId,
					},
				},
			}),
			...(message.interactive && {
				interactive: {
					...(message.interactive.buttons && {
						button_reply: {
							id: message.interactive.buttons?.buttonReply?.id,
							title: message.interactive.buttons?.buttonReply?.title,
							description: message.interactive.buttons?.buttonReply?.description,
						},
						type: 'button_reply', // hardcoded because of enumType in proto
					}),
					...(message.interactive.list && {
						list_reply: {
							id: message.interactive.list.listReply?.id,
							title: message.interactive.list.listReply?.title,
							description: message.interactive.list.listReply?.description,
						},
						type: 'list_reply', // hardcoded because of enumType in proto
					}),
					...(message.interactive.extensions && {
						type: message.interactive.extensions.type,
						nfm_reply: {
							body: message.interactive.extensions.nfmReply?.body,
							name: message.interactive.extensions.nfmReply?.name,
							response_json: message.interactive.extensions.nfmReply?.responseJson,
						},
					}),
				},
			}),
			...(message.order && {
				order: {
					catalog_id: message.order.catalogId,
					product_items: message.order.productItems?.map((item) => ({
						currency: item?.currency,
						item_price: item?.itemPrice,
						product_retailer_id: item?.productRetailerId,
						quantity: item?.quantity,
					})),
				},
			}),
		};
	};
}
