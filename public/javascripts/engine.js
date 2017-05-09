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
            newField("property", "generateShaclText");
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
        newField("propertySub", "generateShaclTextSub");
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

        shaclGraph = new SimpleRDF(shaclContext, 'http://www.w3.org/ns/shacl#NewShape');
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

        // COLLECT DATA

        var propertySave = [];
        var resultProperty;
        $.each(inputShaclBuilder, function (key) {
             resultProperty = $.grep(inputShaclBuilder, function(e){
                return e.name === 'property' + key;
            });

            if (resultProperty.length !== 0) {
                propertySave.push(resultProperty)
            }
        });

        var shaclClassSubSave = [];
        var resultshaclClassSub;
        $.each(inputShaclBuilder, function (key) {
            resultshaclClassSub = $.grep(inputShaclBuilder, function(e){
                return e.name === 'shaclClassSub' + key;
            });
            if (resultshaclClassSub.length !== 0) {
                shaclClassSubSave.push(resultshaclClassSub)
            }
        });

        var propertySubSave = [];
        var resultPropertySub;

        $.each(inputShaclBuilder, function (key) {
            resultPropertySub = $.grep(inputShaclBuilder, function(e){
                return e.name === 'propertySub' + key;
            });
            if (resultPropertySub.length !== 0) {
                propertySubSave.push(resultPropertySub)
            }
        });

        // Prepare for graph
        var nodeX = [];

        $.each(shaclClassSubSave, function (keyA) {
            nodeX[keyA] =  shaclClassSubSave[keyA];
            if (propertySubSave[keyA] !== undefined) {
                $.each(propertySubSave[keyA], function (keyB) {
                    nodeX[keyA].push(propertySubSave[keyA][keyB])
                });
            }
        });


        // Graph it (SHACL GRAPH)

        // SHACL GRAPH CLASS
        $.each(inputShaclBuilder, function (key) {
                if (inputShaclBuilder[key].name === 'shaclClass') {
                    shaclGraph['targetClass'] = inputShaclBuilder[key].value;
                }
        });

        $.each(propertySave, function (keyA) {

            $.each(propertySave[keyA], function (keyB) {

                if (hasSubGraph(propertySave[keyA][keyB]) === true) {

                    var nameID = propertySave[keyA][keyB].name.split('property')[1];
                    var graphSubNode = shaclGraph.child();

                    //get class
                    var propertyClass = getClass(propertySave[keyA][keyB]);

                    // Predicate and Class for BlankNode
                    graphSubNode['class'] = propertyClass;
                    graphSubNode['path'] = propertySave[keyA][keyB].value;
                    graphSubNode['name'] = propertySave[keyA][keyB].value;

                    // Node to connect other graph
                    graphSubNode['node'] = 'http://www.w3.org/ns/shacl#NewShape' + nameID ;
                    graphSubNode['nodeKind'] = 'http://www.w3.org/ns/shacl#BlankNode';

                    // Add to main graph
                    shaclGraph.property.push(graphSubNode);


                } else {
                    var graphTemp = shaclGraph.child();

                    graphTemp['path'] = propertySave[keyA][keyB].value;
                    graphTemp['name'] = propertySave[keyA][keyB].value;

                    shaclGraph.property.push(graphTemp);
                }

            });
        });

        function hasSubGraph(propertyName) {
            var namePropertyID = propertyName.name.split('property')[1];
            var subGraphExists = false;
            $.each(nodeX, function (key) {
                var namePropertySubID = nodeX[key][0].name.split('shaclClassSub')[1];
                if (namePropertyID === namePropertySubID) {
                    subGraphExists = true;
                    return false;
                }
            });
            return subGraphExists;
        }

        function getClass(propertyName) {
            var namePropertyID = propertyName.name.split('property')[1];
            var propertyClass;
            $.each(nodeX, function (key) {
                var namePropertySubID = nodeX[key][0].name.split('shaclClassSub')[1];
                if (namePropertyID === namePropertySubID) {
                    propertyClass = nodeX[key][0].value;
                    return false;
                }
            });
            return propertyClass;
        }

        // SHACL SUB GRAPH

        $.each(shaclGraphsSub, function (keyA) {
            if (propertySubSave[keyA] !== undefined) {
                $.each(propertySubSave[keyA], function (keyB) {

                    var graphSubNodeProperty = shaclGraphsSub[keyA].child();

                    graphSubNodeProperty['path'] = propertySubSave[keyA][keyB].value;
                    graphSubNodeProperty['name'] = propertySubSave[keyA][keyB].value;

                     shaclGraphsSub[keyA].property.push(graphSubNodeProperty);
                });
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

        // Import existing SHACL GRAPH

        var parser = new N3Parser();

        var tripleParsed;
        var graphInput = rdf.createGraph();

        parser.process('<http://www.w3.org/ns/shacl#PersonShape> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .' +
            '<http://www.w3.org/ns/shacl#PersonShape> <http://www.w3.org/ns/shacl#targetClass> <http://schema.org/Person> .' +
            '<http://www.w3.org/ns/shacl#PersonShape> <http://www.w3.org/ns/shacl#property> [' +
            ' <http://www.w3.org/ns/shacl#path> <http://schema.org/givenName> ;' +
            ' <http://www.w3.org/ns/shacl#name> <http://schema.org/givenName> ] .', function (triple) {

            console.log(triple.toString());

            tripleParsed = rdf.createTriple(triple.subject, triple.predicate, triple.object);

            graphInput.add(tripleParsed);

        }).then(function () {

            console.log("Graph durch String Input");
            console.log(graphInput.toString());
            console.log(graphInput);


            var newShaclGraph = new SimpleRDF(shaclContext, 'http://www.w3.org/ns/shacl#PersonShape', graphInput);

            /*
             // Das ist der Code, wie ein Array für ein Property gemacht würde
             var propertyChild = newShaclGraph.child();

             propertyChild['name'] = (triple.object);
             propertyChild['path'] = (triple.object);

             newShaclGraph['property'].push(propertyChild);
             */

            console.log("In der nächste sollte jetzt <http://schema.org/givenName> kommen");
            $.each(graphInput['property']._array, function (key) {
               console.log(newShaclGraph['property']._array[key].path);
               console.log(newShaclGraph['property']._array[key].name);
            });

        }).catch(function (error) {
           console.log((error));
        });

        // wenn input, dann überschreiben
        // shaclGraph = shaclGraphInput;


        /**
         * PART III: CONVERT SHACL SHAPE GRAPH TO JSON AND MAKE MAPPER
         */

        // Convert Shacl Shape Graph to JSON
        var shaclForm = [];

        $.each(shaclGraph['property']._array, function (key) {
            // load properties and output
            console.log(shaclGraph['property']._array[key].path);

            var shaclPath = shaclGraph['property']._array[key].path;
            var shaclName = shaclGraph['property']._array[key].name;
            var shaclNode = shaclGraph['property']._array[key].node;
            var shaclNodeKind = shaclGraph['property']._array[key].nodeKind;
            var shaclClass = shaclGraph['property']._array[key].class;

            // Exclude BlankNode
            if (shaclNodeKind === 'http://www.w3.org/ns/shacl#BlankNode') {
                shaclForm[key] = {
                    "type": "hidden",
                    "label": "blankNode",
                    "name": shaclPath,
                    "value": shaclNodeKind,
                    "classBN": shaclClass
                };
            } else {
                shaclForm[key] = {
                    "type": "text",
                    "label": shaclPath,
                    "name": shaclName
                }
            }
        });

        var shaclFormTemp = [];

        $.each(shaclGraphsSub, function (keyA) {
            $.each(shaclGraphsSub[keyA]['property']._array, function (keyB) {
                // load properties and output
                console.log(shaclGraphsSub[keyA]['property']._array[keyB].path);

                var shaclPathSub = shaclGraphsSub[keyA]['property']._array[keyB].path;
                var shaclNameSub = shaclGraphsSub[keyA]['property']._array[keyB].name;
                var shaclNodeSub = shaclGraphsSub[keyA].iri()['nominalValue'];

                var shaclNodeKindSub = shaclGraphsSub[keyA]['property']._array[keyB].nodeKind;
                var shaclClassSub = shaclGraphsSub[keyA]['property']._array[keyB].class;

                // Find parentPath
                var shaclParentPath = findParentPath(shaclNodeSub);

                shaclFormTemp.push(
                    {
                        "type": "text",
                        "label": shaclPathSub,
                        "name": shaclNameSub,
                        "class": "inputSub",
                        "parentNode": shaclNodeSub,
                        "parentPath": shaclParentPath
                    }
                )
            });
        });

        function findParentPath (shaclNodeSub) {
            var parentPath;
            $.each(shaclGraph['property']._array, function (key) {
                if (shaclGraph['property']._array[key].node === shaclNodeSub) {
                    parentPath = shaclGraph['property']._array[key].path;
                    return false;
                }
            });
            return parentPath;
        }

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
        var shaclData = JSON.parse(localStorage.getItem('shaclForm'));

        // Load values to Array
        var inputFields = $(this).serializeArray();

        console.log("Input USERDATA from Fields: " + JSON.stringify(inputFields));

        var contextGraph = {
            '@type': {
                '@id': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                '@type': '@id'
            }
        };

        // Generate dynamic context for Graph
        $.each(inputFields, function (key) {

            console.log("Data Shacl Input: " + JSON.stringify(shaclData[key]));

            if (shaclData[key].value === 'http://www.w3.org/ns/shacl#BlankNode') {
                contextGraph[shaclData[key].name] = {
                    '@id': inputFields[key].name,
                    '@type': '@id',
                    '@container': '@set'
                }
            } else if (shaclData[key].parentNode !== undefined) {
                contextGraph[shaclData[key].label] = {
                    '@id': inputFields[key].name,
                    '@container': '@set'
                    };
            } else {
                contextGraph[shaclData[key].label] = inputFields[key].name;
            }
        });

        console.log("contextGraph: " + JSON.stringify(contextGraph));

        var triple = new SimpleRDF(contextGraph, subjectStatic);

        // Class of the Graph
        triple['@type'] = shaclGraph['targetClass'];

        // make Graph
        var graphBlankNode = [];
        $.each(inputFields, function (keyA) {

            if (shaclData[keyA].label !== 'blankNode' && shaclData[keyA].parentNode === undefined) {
                triple[shaclData[keyA].name] = inputFields[keyA].value;
            }

            if (shaclData[keyA].label === 'blankNode' && shaclData[keyA].type === 'hidden') {
                graphBlankNode[keyA] = triple.child();

                graphBlankNode[keyA]['@type'] = shaclData[keyA].classBN;

                $.each(inputFields, function (keyB) {
                   if (shaclData[keyA].name === shaclData[keyB].parentPath) {
                       graphBlankNode[keyA][shaclData[keyB].name] = inputFields[keyB].value;
                   }
                });
                triple[shaclData[keyA].name].push(graphBlankNode[keyA]);
            }
        });
        console.log("RDF DATA GRAPH:");
        console.log(triple.toString());


        // Serializer
        /*

         var serializer = new NTriplesSerializer()

         var simpleGraph = rdf.createGraph()

         simpleGraph.add(rdf.createTriple(
         rdf.createNamedNode('http://example.org/subject'),
         rdf.createNamedNode('http://example.org/predicate'),
         rdf.createLiteral('object')
         ))

         //simpleGraph.add(shaclGraph.toString());

         serializer.serialize(shaclGraph).then(function (nTriples) {
         console.log(nTriples);
         })
         */

        // GUI output
        $.each(triple, function (key) {
            $('#rdf-graph').text(triple.toString());
        });

        return false;
    });

    /**
     *
     *  FUNCTIONS
     *
     **/

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
    function newField(name, className) {
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