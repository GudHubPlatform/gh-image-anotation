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
                    images_app_id: null,
                    images_field_id: null,
                    interpretation: [
                        {
                            src: 'form',
                            id: 'default',
                            settings: {
                                editable: 1,
                                show_field_name: 1,
                                show_field: 1,
                            },
                            style: { position: 'beetwen' },
                        },
                    ],
                },
            },
        };
    }

    /*------------------------------- INTERPRETATION --------------------------------------*/

    getInterpretation(gudhub, value, appId, itemId, field_model) {
        return [
            {
                id: 'default',
                name: 'Default',
                content: () => `
                    <gh-image-annotation 
                        app-id="{{field_model.data_model.images_app_id}}"
                        item-id="{{itemId}}"
                        field-id="{{field_model.data_model.images_field_id}}"
                    ></gh-image-annotation>
                `,
            },
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
                            title: 'Images Source',
                            type: 'header',
                        },
                        {
                            type: 'ghElement',
                            property: 'data_model.images_app_id',
                            data_model() {
                                return {
                                    data_type: 'app',
                                    field_name: 'Images AppID',
                                    name_space: 'images_app_id',
                                    data_model: {
                                        interpretation: [
                                            {
                                                src: 'form',
                                                id: 'with_text',
                                                settings: {
                                                    editable: 1,
                                                    show_field_name: 1,
                                                    show_field: 1,
                                                },
                                            },
                                        ],
                                    },
                                };
                            },
                        },
                        {
                            type: 'ghElement',
                            property: 'data_model.images_field_id',
                            onInit(settingScope, fieldModel) {
                                settingScope.$watch(
                                    () => fieldModel.data_model.images_app_id,
                                    (newValue) => {
                                        settingScope.field_model.data_model.app_id = newValue;
                                    }
                                );
                            },
                            data_model(fieldModel) {
                                return {
                                    data_type: 'field',
                                    field_name: 'Images FieldID',
                                    name_space: 'images_field_id',
                                    data_model: {
                                        app_id: fieldModel.data_model.images_app_id,
                                    },
                                };
                            },
                        }
                    ]
                ]
            }
        ];
    }
}
