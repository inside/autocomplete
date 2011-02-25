<?php

if (!isset($_GET['q']))
{
    return;
}

$words = array(
    'and', 'a an', 'a another', 'are', 'as', 'abé', 'abén',
    'at', 'all', 'an', 'about', 'after',
    'any', 'also', 'around', 'another', 'a question',
    'again', 'air', 'away', 'animal', 'answer',
    'america', 'add', 'along', 'always', 'almost',
    'above', 'am', 'ate', 'act', 'ant',
    'absent', 'admit', 'album', 'ann', 'able',
    'ace', 'added', 'afraid', 'afternoon', 'age',
    'ahead', 'annoy', 'anything', 'anyway', 'anywhere',
    'ape', 'applaud', 'arm', 'artist', 'attack',
    'attic', 'auto', 'avoid', 'awesome', 'awful',
    'awning', 'aid', 'aim', 'arc', 'art',
    'ash', 'axe', 'ax', 'against', 'american',
    'among', 'asked', 'ah', 'ago', 'ache',
    'aunt', 'agree', 'alive', 'apple', 'april',
    'awake', 'adult', 'angry', 'anyone', 'arrive',
    'asleep', 'august', 'avenue', 'airport', 'anybody',
    'address', 'airplane', 'alphabet', 'astronaut', 'automobile',

    'bag', 'bad', 'bam', 'bat', 'bid',
    'bug', 'bud', 'bum', 'beg', 'bed',
    'bet', 'be', 'by', 'but', 'been',
    'back', 'before', 'boy', 'big', 'because',
    'between', 'below', 'begin', 'both', 'began',
    'book', 'being', 'best', 'better', 'black',
    'blue', 'bring', 'brown', 'buy', 'bake',
    'band', 'bank', 'bell', 'belt', 'ben',
    'bend', 'bent', 'bess', 'bike', 'bit',

    'cap', 'cab', 'cop', 'con', 'cup',
    'cub', 'can', 'could', 'call', 'come',
    'came', 'change', 'country', 'city', 'chose',
    'children', 'car', 'carry', 'cut', 'clean',
    'cold', 'camp', 'cane', 'can\'t', 'cape',
    'cast', 'cat', 'clad', 'clam', 'clamp',
    'clan', 'clap', 'clasp', 'class', 'cliff',
    'cling', 'clink', 'clip', 'close', 'clot',

    'dad', 'dan', 'dig', 'dip', 'don',
    'dog', 'dud', 'dug', 'do', 'down',
    'day', 'did', 'does', 'different', 'don\'t',
    'done', 'draw', 'drink', 'dam', 'damp',
    'den', 'dent', 'dim', 'dime', 'dine',
    'dire', 'dive', 'dope', 'draft', 'drag',
    'drank', 'dress', 'drift', 'drill', 'drip',
    'drop', 'drove', 'drug', 'drum', 'dump',
    'dust', 'dash', 'deck', 'dentist', 

    'each', 'end', 'even', 'every', 'earth',
    'eye', 'example', 'enough', 'eat', 'eight',
    'eve', 'expanded', 'ellen', 'easel', 'easy',
    'egg', 'elbow', 'enjoy', 'ever', 'evergreen',
    'everyone', 'everything', 'everywhere', 'explore', 'ear',
    'eel', 'elf', 'elk', 'elm', 'era',
    'east', 'ed', 'eyes', 'edge', 'else',
    'erase', 'eagle', 'empty', 'extra', 'earache',
    'excited', 'elephant', 'everybody',
); 

function filter_words($words, $search)
{
    $r = array();
    $q = urldecode($_GET['q']);

    foreach ($words as $word)
    {
        if (preg_match('#^' . $q . '#', $word))
        {
            $r[] = $word;
        }
    } 

    return $r;
}

$output = array(
    'searchedString' => $_GET['q'],
    'results' => filter_words($words, $_GET['q'])
); 

header('Content-type', 'application/json');
echo json_encode($output);
