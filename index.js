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
                    watch: {
                        app_id: null,
                        field_id: null
                    },
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
                content: () =>
                    '<gh-image-annotation app-id="{{appId}}" item-id="{{itemId}}" field-id="{{fieldId}}"></gh-image-annotation>',
            },
        ];
    }

    /*--------------------------  SETTINGS --------------------------------*/

    getSettings() {
        return [
            {
                title: 'Options',
                type: 'general_setting',
                icon: 'menu',
                columns_list: [
                    [
                        {
                            title: 'Image Source',
                            type: 'header',
                        },
                        {
                            type: 'ghElement',
                            property: 'data_model.watch.app_id',
                            data_model: function (fieldModel) {
                                return {
                                    field_name: 'Application with images',
                                    data_type: 'app',
                                    name_space: 'application',
                                    data_model: {
                                        current_app: false,
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
                            property: 'data_model.watch.field_id',
                            data_model: function (fieldModel, appId) {
                                return {
                                    data_model: {
                                        app_id: appId,
                                    },
                                    field_name: 'Field with images',
                                    name_space: 'field_with_images',
                                    data_type: 'field',
                                };
                            },
                        },
                    ],
                ],
            },
        ];
    }
}
