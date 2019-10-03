let neural_network;

let training_data;
let testing_data;

/**
 * Where are we in training and testing data
 */
let training_index = 0;
let testing_index = 0;

/**
 * Network Configuration
 */
let input_nodes = 784;
let hidden_nodes = 256;
let output_nodes = 10;

/**
 * How may times through all the training data
 */
let epochs = 1;

let learning_rate = 0.1;

/**
 * How is the network doing
 */
let total_correct = 0;
let total_guess = 0;

/**
 * Canvas
 */
let canvas_width = 320;
let canvas_height = 280;

/**
 * This is for draw image
 */
let userPixels;
let smaller;
let ux = 16;
let uy = 100;
let uw = 140;

/**
 * Reporting status to a paragraph
 */
let status_paragraph;

/**
 * Load the training and testing data
 */
function preload () {   
    training_data = loadStrings('./data/train_10000.csv', () => console.log("Training data loaded"))
    testing_data = loadStrings('./data/test_1000.csv', () => console.log("Testing data loaded"))
}

function setup () {
   createCanvas(canvas_width, canvas_height);       // Creating canvas
   neural_network = new NeuralNetwork(input_nodes, hidden_nodes, output_nodes, learning_rate);
   status_paragraph = createP('');      // Create a paragraph
   let pause_button = createButton ('pause');
   pause_button.mousePressed(toggle);
   function toggle () {
    if (pause_button.html() == 'pause') {
        noLoop();
        pause_button.html('continue')
    } else {
        loop ();
        pause_button.html('pause');
    }
   }    // End of inner function
   // This button clears the usePixels
   let clear_button = createButton ('clear');
   clear_button.mousePressed(() => userPixels.background(0));
   // Save the model
   let save_button = createButton('save model');
   save_button.mousePressed(() => saveJSON(neural_network, 'model.json'));

   userPixels = createGraphics(uw, uw)      // Create a blank user canvas
   userPixels.background(0);
   // Create a smaller 28x28 image
   smaller = createImage(28, 28);
   let img = userPixels.get();      // Getting all the pixels
   smaller.copy(img, 0, 0, uw, uw, 0, 0, smaller.width, smaller.height);        // Create a smaller copy of the image
}

function draw () {
    background(200);
    let train_data = train();       // One image per cycle
    let result = test();        // The result come back as an array of 3 things
    let test_data = result[0];      // Input data
    let guess = result[1];      // What was the guess?
    let correct = result[2];    // Was it correct
    // Draw the training and testing image
    drawImage (train_data, ux, 16, 2, 'Training');
    drawImage (test_data, 180, 16, 2, 'Test');
    // Draw the resulting guess
    fill(0);
    rect (246, 16, 2*28, 2*28);
    if (correct)
        fill(0, 255, 0);
    else
        fill(255, 0, 0)
    textSize(60);
    text(guess, 258, 64)
    if (correct)
        total_correct++;
    total_guess++;
    // Show performance and number of epochs    
    let status = 'performance: ' + nf(total_correct / total_guess, 0, 2);
    status += '<br>';
    let percent = (training_index / training_data.length) * 100;
    status += 'epochs: ' + epochs + '(' + nf(percent, 1, 2) + '%)'
    status_paragraph.html(status)
    // Draw userPixels
    image(userPixels, ux, uy)
    fill(0);
    textSize(12);
    text('draw here', ux, uy + uw + 16)
    image(smaller, 180, uy, 2*28, 2*28)

    // Change the pixels from user into network input
    let inputs = [];
    smaller.loadPixels();
    for (let i = 0; i < smaller.pixels.length; i += 4) 
        inputs[i / 4] = map (smaller.pixels[i], 0, 255, 0, 0.99) + 0.01;
    let outputs = neural_network.query(inputs);
    guess = findMax(outputs);
    // Draw the result
    fill(0);
    rect (246, uy, 2*28, 2*28);
    fill(255);
    textSize(60);
    text(guess, 258, uy + 48);    
}   

/**
 * When mouse is dragged, draw on userPixels
 */
function mouseDragged () {    
    // draw under certain conditions
    if (mouseX > ux && mouseY > uy && mouseX < ux + uw && mouseY < uy + uw) {
       
        userPixels.fill(255);       //  draw white circles
        userPixels.stroke(255);
        userPixels.ellipse(mouseX - ux, mouseY - uy, 8, 8);
        let img = userPixels.get();
        smaller.copy(img, 0, 0, uw, uw, 0, 0, smaller.width, smaller.height);
    }
}

/**
 * Function to train the network
 */
function train () {
    let values = training_data[training_index].split(',');      // Grab a row from CSV
    let inputs = [];        // Input array for the network
    for (let i = 1; i < values.length; i++)
        inputs[i - 1] = map (Number(values[i]), 0, 255, 0, 0.99) + 0.01;      // Not so great to use input of 0 so add 0.01
    let targets = [];
    for (let i = 0; i < output_nodes; i++)      // Everything is by default wrong
        targets[i] = 0.01;
    let label = Number(values[0])   // The first spot is the class
    targets[label] = 0.99;      // So it should be 0.99
    neural_network.train(inputs, targets);
    training_index++;
    if (training_index == training_data.length) {
        training_index = 0;
        epochs++;
    }
    return inputs;      // Return the inputs to draw them
}   // End of train function

/**
 * Function to test the network
 */
function test () {
    let values = testing_data[testing_index].split(',');       // Grab a row
    let inputs = [];
    for (let i = 1; i < values.length; i++)
        inputs[i - 1] = map (Number(values[i]), 0, 255, 0, 0.99) + 0.01;
    let label = Number(values[0]);
    let outputs = neural_network.query(inputs);     // run data through the network
    let guess = findMax(outputs);   // Find the index of maximum number
    let correct = false;        // Was the network right or wrong
    if (guess == label)
        correct = true;
    if (frameCount % 30 == 0) {     // Switch to new testing point every so often
        testing_index++;
        if (testing_index == testing_data.length)
            testing_index = 0;
    }
    return [inputs, guess, correct];
}   // End of test function

/**
 * Function to find the maximum value in an array
 */
function findMax (list) {
    let index = 0;
    let max = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] > max) {
            max = list[i];
            index = i;
        }
    }
    return index;
}   // End of findMax function

/**
 * Draw the array of floats as an image
 */
function drawImage (values, x_offset, y_offset, w, txt) {
    let dimension = 28;     // It's 28 x 28 image
    for (let i = 0; i < values.length; i++) {
        let brightness = values[i] * 256;       // Scale upto 256.
        let x = i % dimension;      // x postion
        let y = floor(i / dimension);
        // Draw rectangle
        fill(brightness);
        noStroke();
        rect(x_offset + x*w, y_offset + y*w, w, w);
    }
    // Draw the label
    fill(0);
    textSize(12);
    text(txt, x_offset, y_offset + w*35);
}   // End of drawImage function
