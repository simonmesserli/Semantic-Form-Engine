jQuery(document).ready(function($) {

    // INIT
    $('.cl-form-builder').toggle();
    $('.cl-rdf').toggle();

    // LOV API Function (search)
    function lovAPI(type) {
        var lovAPIOptions = {
            minLength: 1,
            source: function (request, response) {
                $.ajax({
                    url: "https://lov.okfn.org/dataset/lov/api/v2/term/search",
                    data: {q: request.term, type: type},
                    dataType: "json",
                    success: function (data) {
                        response($.map(data.results, function(value) {
                            // Label and Description
                            var highlight = $.map(value.highlight, function (value) {
                                return {
                                    value: value
                                }
                            });
                            return {
                                label: value.prefixedName,
                                // value: value.prefixedName,
                                value: value.uri,
                                uri: value.uri,
                                type: value.type,
                                prefix: value['vocabulary.prefix'],
                                descr: highlight
                            }
                        }))
                    },
                    error: function () {
                        response([]);
                    }
                })
            },
            select: function (event, ui) {
                if (ui.item.descr[1] !== undefined) {
                    $('.info').append("<b>Label: " + ui.item.descr[1].value + "</b>");
                    $('.info').append('<br /> <br />');
                }
                if (ui.item.descr[0] !== undefined) {
                    $('.info').append("Descrtiption: " + ui.item.descr[0].value);
                    $('.info').append('<br /> <br />');
                }
                $('.info').append("Type: " + ui.item.type);
                $('.info').append('<br /> <br />');
                $('.info').append("Selected: " + ui.item.label);
                $('.info').append('<br /> <br />');
                $('.info').append("URI: " + '<a href=' + ui.item.uri + ' target=_blanc>' + ui.item.uri + '</a>');
                $('.info').append('<br /> <br />');
                $('.info').append("Prefix: " + ui.item.prefix);
                $('.info').append('<br /> <br />');
                $('.info').append('<hr />');

            }
        };

        return lovAPIOptions;
    }

    var lovAPIClass = lovAPI('class');
    var lovAPIProperty = lovAPI('property');

    /*
    FORM GUI
     */

    // Add Form
    var max_fields = 30; // maximum input boxes allowed
    var x = 0; //initilal text box count

    function newField(parentID, name, className) {
        $('<div class= ' + className + '>' +
            '<input type="checkbox" name="hasSub" id="checkBoxProperty' + x + '"/>' +
            '<input type="text" name="'+ name + x + '" size="40" />' +
            '<a href="#" class="remove_field">Remove</a> ' +
            '</div>')
            .insertBefore( "#generateShacl" );
        $('input[name=property'+x+']').autocomplete(lovAPIProperty);
        $('input[name=propertySub'+x+']').autocomplete(lovAPIProperty);
    }

    // remove field
    $('#shacl-form').on("click",".remove_field", function(e){ //user click on remove text
        e.preventDefault(); $(this).parent('div').remove(); x--;
    });

    // For Static HTML fields
    $('.generateShaclClass').autocomplete(lovAPIClass);



    $('#add-shacl').click(function(e){ //on add input button click
        e.preventDefault();
        if (x < max_fields){ //max input box allowed
            x++; //text box increment
            newField(null, "property", "generateShaclText");
        }
            // Checkbox checked
            $("#checkBoxProperty" + x + "").change(function(){
                if (this.checked) {
                    $(this).parent('div').append('<button type="button" id="add-sub" class="sub">addNew</button>');
                    $(this).parent('div').append('<input type="text" name="shaclClassSub'+ x +'" class="generateShaclClassSub" size="40">');
                    $('.generateShaclClassSub').autocomplete(lovAPIClass);

                };
            });
    });

    $('#shacl-form').on("click", ".sub", function(e) { //on add input button click
        e.preventDefault();
        newField(null, "propertySub", "generateShaclTextSub");
    });

    /*
    SHACL GENERIEREN UND FORM ERSTELLEN
     */

    var shaclGraph;
    var shaclGraph2;

    // Formular SHACL generieren
    $('#shacl-form').submit(function( event ) {
        event.preventDefault();

        var inputShaclBuilder = $(this).serializeArray();
        console.log("Input HTML fields Shacl Builder: " + JSON.stringify(inputShaclBuilder));

        // Generate SHACL SHAPE GRAPH
        var shaclContext = {
            '@type': {
                '@id': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                '@type': '@id'
            },
            targetClass: {
                '@id': 'http://www.w3.org/ns/shacl#targetClass',
                '@type': '@id'
            },
            property: {
                '@id': 'http://www.w3.org/ns/shacl#property',
                '@type': '@id',
                '@container': '@set'
            },
            path: {
                '@id': 'http://www.w3.org/ns/shacl#path',
                '@type': '@id'
            },
            name: 'http://www.w3.org/ns/shacl#name',
            node: {
                '@id': 'http://www.w3.org/ns/shacl#node',
                '@type': '@id'
            },
            class: {
                '@id': 'http://www.w3.org/ns/shacl#class',
                '@type': '@id'
            },
            nodeKind: {
                '@id': 'http://www.w3.org/ns/shacl#nodeKind',
                '@type': '@id'
            }
        };

        shaclGraph = new SimpleRDF(shaclContext, 'http://www.w3.org/ns/shacl#PersonShape');
        shaclGraph2 = new SimpleRDF(shaclContext, 'http://www.w3.org/ns/shacl#AddressShape');


        // Static
        shaclGraph['@type'] = 'http://www.w3.org/ns/shacl#NodeShape';
        shaclGraph2['@type'] = 'http://www.w3.org/ns/shacl#NodeShape';

        // Graph it
        $.each(inputShaclBuilder, function (key) {
            if (inputShaclBuilder[key] !== undefined) {
                if (inputShaclBuilder[key].name === 'shaclClass') {
                    shaclGraph['targetClass'] = inputShaclBuilder[key].value;
                } else if (inputShaclBuilder[key].name === 'hasSub' && inputShaclBuilder[key].value === 'on') {

                    var graphSubNode = shaclGraph.child();

                    graphSubNode['class'] = inputShaclBuilder[key+2].value;
                    graphSubNode['path'] = inputShaclBuilder[key+1].value;
                    graphSubNode['name'] = inputShaclBuilder[key+1].value;
                    // TODO Dynamischer Name aus Form
                    graphSubNode['node'] = 'http://www.w3.org/ns/shacl#AddressShape';
                    graphSubNode['nodeKind'] = 'http://www.w3.org/ns/shacl#BlankNode';

                    shaclGraph.property.push(graphSubNode);

                    var graphSubNodeProperty = shaclGraph2.child();

                    //TODO Dynamic Key
                    graphSubNodeProperty['path'] = inputShaclBuilder[key+3].value;
                    graphSubNodeProperty['name'] = inputShaclBuilder[key+3].value;

                    shaclGraph2.property.push(graphSubNodeProperty);

                    //remove unused element
                    inputShaclBuilder.splice(key + 1, 3);
                } else {
                    if (inputShaclBuilder[key].name === 'hasSub'){
                        // remove Checkboxes
                        Array.prototype.splice(inputShaclBuilder[key], 1);
                    }
                            var graphTemp = shaclGraph.child();

                            graphTemp['path'] = inputShaclBuilder[key].value;
                            graphTemp['name'] = inputShaclBuilder[key].value;

                            shaclGraph.property.push(graphTemp);
                    }
            }
        });

        // Output Konsole
        console.log("Shacl Shape Graph (RDF): " + shaclGraph.toString());
        console.log("Shacl Shape Graph2 (RDF): " + shaclGraph2.toString());

        // Convert Shacl Shape Graph to JSON
        var shaclForm = [];
        var shaclFormTemp = [];

        $.each(shaclGraph['property']._array, function (key) {

            // load properties and output
            console.log(shaclGraph['property']._array[key].path);

            var shaclPath = shaclGraph['property']._array[key].path;
            var shaclName = shaclGraph['property']._array[key].name;
            var shaclNode = shaclGraph['property']._array[key].node;
            var shaclNodeKind = shaclGraph['property']._array[key].nodeKind;
            var shaclClass = shaclGraph['property']._array[key].class;

            if (shaclNode !== undefined) {

                var shaclNodeSub = shaclGraph['property']._array[key].node;

                $.each(shaclGraph2['property']._array, function (key) {

                        var shaclPathSub = shaclGraph2['property']._array[key].path;
                        var shaclNameSub = shaclGraph2['property']._array[key].name;

                        var shaclNodeKindSub = shaclGraph2['property']._array[key].nodeKind;
                        var shaclClassSub = shaclGraph2['property']._array[key].class;

                        shaclFormTemp[key] = {
                            "type": "text",
                            "label": shaclPathSub,
                            "name": shaclNameSub,
                            "class": "inputSub",
                            "parentNode": shaclNodeSub
                        };

                        console.log("log InnerLoop: " + JSON.stringify(shaclFormTemp[key]));
                        console.log(shaclNodeSub);
                });
            }

            // Exclude BlankNode
            if (shaclNodeKind === 'http://www.w3.org/ns/shacl#BlankNode') {
                shaclForm[key] = {
                    "type": "hidden",
                    "label": "blankNode",
                    "name": shaclPath,
                    "value": shaclNodeKind
                };
            } else {
                shaclForm[key] = {
                    "type": "text",
                    "label": shaclPath,
                    "name": shaclName
                }
            }
        });


        console.log("shaclFormTemp : " + JSON.stringify(shaclFormTemp));

        // Merge all graphs to one array
        shaclForm = $.merge(shaclForm, shaclFormTemp);


        // Clean shaclForm
        shaclForm.clean(undefined);

        // Convert to JSON and Store
        var shaclFormJSON = JSON.stringify(shaclForm);
        localStorage.setItem("shaclForm", shaclFormJSON);

        // Output Shacl Shape Graph
        // Info Box Update
        $('.info').append('<b>SHACL Shape Graph generiert</b>');
        $('.info').append('<p><div class="infoNew"></div>');
        $('.infoNew').text(shaclGraph.toString());
        $('.info').append('<p>');

        // Output JSON
        // Info Box Update
        $('.info').append('<b>SHACL To FormBuilder JSON konvertiert</b>');
        $('.info').append('<p>' + shaclFormJSON + '</p>');

        // Activate Form Builder
        $('.cl-form-builder').toggle();

        // Render Formular with formBuilder
        // load form
        form = localStorage.getItem("shaclForm");

        /*
        form = [
            {
                "type":"text",
                "label":"http://schema.org/givenName",
                "name":"http://schema.org/givenName"
            },
            {
                "type":"hidden",
                "label":"blankNode",
                "name":"http://schema.org/address",
                "value":"http://www.w3.org/ns/shacl#BlankNode"
            },
            {
                "type":"label",
                "label":"http://schema.org/PostalAddress",
                "name":"http://schema.org/PostalAddress",
                "class": "sub"
            },
            {
                "type":"text",
                "label":"http://schema.org/streetAddress",
                "name":"http://schema.org/streetAddress",
                "class": "inputSub"
            }
        ]
        form = JSON.stringify(form);
        */

        console.log("formular: " + form);

        // Optionen for formRender
        var formRenderOpts = {
            formData: form,
            dataType: 'json'
        };
        // render form
        $('.fb-render').formRender(formRenderOpts);

        return false;
    });


    // Subject on field change
    var subjectStatic
    $("#subject").on("keyup change", function() {
        subjectStatic = this.value;
        $("#dom_element").text(this.value);
    });

    // Generate RDF
    $('#html-form').submit(function( event ) {
        event.preventDefault();

        //Visibility
        $('.cl-rdf').toggle();

        // Parse JSON
        var data = JSON.parse(localStorage.getItem('shaclForm'));

        // Load values to Array
        var inputFields = $(this).serializeArray();

        console.log("Input Data Fields: " + JSON.stringify(inputFields));


        var contextGraph = {
            '@type': {
                '@id': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                '@type': '@id'
            },
            blankNode: {
                '@id': 'blankNode',
                '@type': '@id',
                '@container': '@set '
            }
        };

        /*
        var contextGraphNew = {
            '@graph': {
                '@id': "http://example.org/s",
                '@type': "http://schema.org/Person",
                'http://schema.org/address': {
                    '@id': "_:b0"
                }

            {
                '@id': '_:b0',
                "http://schema.org/streetAddress": "haselweg 15"
            }

        };
        */




        // Generate context for Graph
        $.each(inputFields, function (key) {

            console.log("data Input: " + JSON.stringify(data[key]));

            if (inputFields[key].value === 'http://www.w3.org/ns/shacl#BlankNode') {
                contextGraph['blankNode']['@id'] = data[key].name
            } else {
                contextGraph[data[key].label] = data[key].name;
            }
        });

        console.log("contextGraph: " + JSON.stringify(contextGraph));


        var triple = new SimpleRDF(contextGraph, subjectStatic);

        // Class of the Graph
        triple['@type'] = shaclGraph['targetClass'];

        // make Graph
        $.each(inputFields, function (key) {
            if (inputFields[key].value === 'http://www.w3.org/ns/shacl#BlankNode') {
                var graphBlank = triple.child();
                triple.blankNode.push(graphBlank);
            } else if (inputFields[key].node !== undefined) {
                console.log("hall0");
            } else {
                triple[data[key].label] = inputFields[key].value;
            }
        });

        console.log(triple.toString());

        $.each(triple, function (key) {
            $('#rdf-graph').text(triple.toString());
        });

        return false;
    });

    // RESET
    $('#reset').click(function( e ) {
        e.preventDefault();
        location.reload();
        return false;
    });

    // Array Cleaner
    Array.prototype.clean = function(deleteValue) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] == deleteValue) {
                this.splice(i, 1);
                i--;
            }
        }
        return this;
    };

});