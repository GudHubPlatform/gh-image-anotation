import 'fabric';

import './src/components/image-annotation/image-annotation.js';
import './src/components/annotations-editor/annotations-editor.js';
import './src/components/annotations-viewer/annotations-viewer.js';

export default class GhImageAnnotation {
	/*------------------------------- FIELD TEMPLATE --------------------------------------*/

	getTemplate() {
        return {
            constructor: 'field',
            name: 'ImageAnnotation',
            icon: 'text_icon',
            model: {
                field_id: 0,
                field_name: 'ImageAnnotation',
                field_value: '',
                data_type: 'image_annotation',
                data_model: {
                    interpretation: [{
                        src: 'form',
                        id: 'default',
                        settings: {
                            editable: 1,
                            show_field_name: 1,
                            show_field: 1
                        },
                        style: { position: "beetwen" }
                    }]
                }
            }
        };
    }

	/*------------------------------- INTERPRETATION --------------------------------------*/

	getInterpretation(gudhub, value, appId, itemId, field_model) {
		return [
			{
				id: 'default',
				name: 'Default',
				content: () => '<gh-image-annotation app-id="{{appId}}" item-id="{{itemId}}" field-id="{{fieldId}}"></gh-image-annotation>',
			},
			{
				id: 'value',
				name: 'Value',
				content: () => value
			}
		];
	}

	/*--------------------------  SETTINGS --------------------------------*/

    getSettings(scope) {
        return [
			{
				title: 'Options',
				type: 'general_setting',
				icon: 'menu',
				columns_list: [
					[
						{
							type: 'ghElement',
							property: 'data_model.color',
							data_model: () => {
								return {
									data_type: 'color',
									field_name: 'Color',
									name_space: 'color'
								}
							}
						}
					]
				]
			}
		];
    }
}