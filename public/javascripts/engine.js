jQuery(document).ready(function($) {

    // INIT
    $('.cl-form-builder').toggle();
    $('.cl-rdf').toggle();

    // LOV API
    var lovAPIClass = lovAPI('class');
    var lovAPIProperty = lovAPI('property');

    /**
     * Part I: SHACL FORM BUILDER GUI
    **/

    // Add newField Options
    var max_fields = 30; // maximum input boxes allowed
    var x = 0; //initilal text box count

    // For Static HTML fields
    $('.generateShaclClass').autocomplete(lovAPIClass);

    // Button Add Field
    $('#add-shacl').click(function(e){ //on add input button click
        e.preventDefault();
        if (x < max_fields){ //max input box allowed
            x++; //text box increment
            newField(null, "property", "generateShaclText");
        }
            // Checkbox checked
            $("#checkBoxProperty" + x + "").change(function(){
                if (this.checked) {
                    $(this).parent('div').append('<button type="button" id="add-sub" class="sub">Add Field</button>');
                    $(this).parent('div').append('<input type="text" name="shaclClassSub'+ x +'" class="generateShaclClassSub" size="40">');
                    $('.generateShaclClassSub').autocomplete(lovAPIClass);

                };
            });
    });

    // Button Add Field in Sub
    $('#shacl-form').on("click", ".sub", function(e) {
        e.preventDefault();
        newField(null, "propertySub", "generateShaclTextSub");
    });

    /**
     * PART II: GENERATES SHACL GRAPH
     **/

    var shaclGraph;

    // generate SHACL Form
    $('#shacl-form').submit(function(e) {
        e.preventDefault();

        // Convert form input to array
        var inputShaclBuilder = $(this).serializeArray();

        // 2 sub
        //inputShaclBuilder = [{"name":"shaclClass","value":"http://schema.org/Person"},{"name":"hasSub","value":"on"},{"name":"property1","value":"http://schema.org/address"},{"name":"shaclClassSub1","value":"http://schema.org/PostalAddress"},{"name":"propertySub1","value":"http://schema.org/streetAddress"},{"name":"hasSub","value":"on"},{"name":"property2","value":"http://xmlns.com/foaf/0.1/knows"},{"name":"shaclClassSub2","value":"http://dbpedia.org/ontology/Cat"},{"name":"propertySub2","value":"http://xmlns.com/foaf/0.1/familyName"}]

        // 1 sub
        //inputShaclBuilder = [{"name":"shaclClass","value":"http://schema.org/Person"},{"name":"hasSub","value":"on"},{"name":"property1","value":"http://schema.org/address"},{"name":"shaclClassSub1","value":"http://schema.org/PostalAddress"},{"name":"propertySub1","value":"http://schema.org/streetAddress"}]

        //normal
        // inputShaclBuilder = [{"name":"shaclClass","value":"http://schema.org/Person"},{"name":"property1","value":"http://schema.org/givenName"},{"name":"property2","value":"http://schema.org/familyName"}]

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

        var shaclGraphsSub = [];

        $.each(inputShaclBuilder, function (key) {
            if (inputShaclBuilder[key].name === 'hasSub' && inputShaclBuilder[key].value === 'on') {
                var nameID = inputShaclBuilder[key+1].name.split('property')[1];
                shaclGraphsSub.push(newSubGraph(nameID));
            }
        });

        function newSubGraph(nameID) {
            var newGraph = new SimpleRDF(shaclContext, 'http://www.w3.org/ns/shacl#NewShape' + nameID);
            newGraph['@type'] = 'http://www.w3.org/ns/shacl#NodeShape';
            return newGraph;
        };

        // Static for main graph
        shaclGraph['@type'] = 'http://www.w3.org/ns/shacl#NodeShape';

        console.log("shaclGraphMain: " + shaclGraph.toString());
        console.log("shaclGraphsSub: " + shaclGraphsSub.toString());

        var propertySubArray = [];

        // Graph it (SHACL GRAPH)

        $.each(inputShaclBuilder, function (key) {
            if (inputShaclBuilder[key] !== undefined) {
                if (inputShaclBuilder[key].name === 'shaclClass') {
                    shaclGraph['targetClass'] = inputShaclBuilder[key].value;
                } else if (inputShaclBuilder[key].name === 'hasSub' && inputShaclBuilder[key].value === 'on') {
                    var nameID = inputShaclBuilder[key+1].name.split('property')[1];

                    var graphSubNode = shaclGraph.child();

                    // Predicate and Class for BlankNode
                    graphSubNode['class'] = inputShaclBuilder[key + 2].value;
                    graphSubNode['path'] = inputShaclBuilder[key + 1].value;
                    graphSubNode['name'] = inputShaclBuilder[key + 1].value;

                    // Node to connect other graph
                    graphSubNode['node'] = 'http://www.w3.org/ns/shacl#NewShape' + nameID ;
                    graphSubNode['nodeKind'] = 'http://www.w3.org/ns/shacl#BlankNode';

                    // Add to main graph
                    shaclGraph.property.push(graphSubNode);

                    var elementKeytoDel;
                    $.each(inputShaclBuilder, function (key) {
                        if (inputShaclBuilder[key].name === 'propertySub' + nameID) {
                            propertySubArray.push(inputShaclBuilder[key]);
                            elementKeytoDel = key;
                        }
                    });
                    // remove element which is already in subarray
                    inputShaclBuilder.splice(elementKeytoDel, 1);

                    $.each(propertySubArray, function (key) {
                        var graphSubNodeProperty = shaclGraphsSub[key].child();

                        graphSubNodeProperty['path'] = propertySubArray[key].value;
                        graphSubNodeProperty['name'] = propertySubArray[key].value;

                        shaclGraphsSub[key].property.push(graphSubNodeProperty);

                    });

                    // remove unused element
                    inputShaclBuilder.splice(key + 2, 1);
                    inputShaclBuilder.splice(key + 1, 1);

                    if (inputShaclBuilder[key].name === 'hasSub') {
                        // remove Checkbox
                        Array.prototype.splice(inputShaclBuilder[key], 1);
                    }

                } else {
                    var graphTemp = shaclGraph.child();

                    graphTemp['path'] = inputShaclBuilder[key].value;
                    graphTemp['name'] = inputShaclBuilder[key].value;

                    shaclGraph.property.push(graphTemp);
                }
            }
        });

        // Output Konsole
        console.log("Shacl Shape Graph (RDF): " + shaclGraph.toString());
        $.each(shaclGraphsSub, function (key) {
            console.log("Shacl Shape Graph Sub " + key + " (RDF): " + shaclGraphsSub[key].toString());
        });

        var shaclGraphComplete = "";
        $.each(shaclGraphsSub, function (key) {
            shaclGraphComplete += shaclGraphsSub[key].toString() + "\n";
        });

        shaclGraphComplete += shaclGraph.toString();

        console.log("shaclGraphComplete: " + shaclGraphComplete);


        /**
         * PART III: CONVERT SHACL SHAPE GRAPH TO JSON
         */

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

                $.each(shaclGraphsSub, function (keyA) {
                    $.each(shaclGraphsSub[keyA]['property']._array, function (keyB) {
                        var shaclPathSub = shaclGraphsSub[keyA]['property']._array[keyB].path;
                        var shaclNameSub = shaclGraphsSub[keyA]['property']._array[keyB].name;
                        var shaclNodeSub = shaclGraphsSub[keyA].iri()['nominalValue'];

                        var shaclNodeKindSub = shaclGraphsSub[keyA]['property']._array[keyB].nodeKind;
                        var shaclClassSub = shaclGraphsSub[keyA]['property']._array[keyB].class;

                        shaclFormTemp[keyA] = {
                            "type": "text",
                            "label": shaclPathSub,
                            "name": shaclNameSub,
                            "class": "inputSub",
                            "parentNode": shaclNodeSub
                        };
                    });
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

        /**
         * PART IV: RENDER JSON TO HTML FORM
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


    /**
     * PART V: INPUT USERDATA AND GENERATE RDF GRAPH
     */

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
                '@container': '@set'
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

        // Generate dynamic context for Graph
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

    /**
     *
     *  FUNCTIONS
     *
     *  **/

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

    // Generates new HTML Input Field
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