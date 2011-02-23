<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="fr">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Autocomplete with prototype demo</title>
    <script type="text/javascript" src="http://www.google.com/jsapi"></script>
    <script type="text/javascript">google.load("prototype", "1.7.0.0");</script>
    <script type="text/javascript" src="autocomplete.js"></script>
<style type="text/css">

#search_input
{
    width: 200px;
}

#autocomplete_search_input
{
    width: 200px;
}

div.suggestions
{
    width: 202px;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
}

div.suggestions div.selected
{
    color: #fff;
    background-color: #3363c7;
}

div.suggestions span
{
    padding-left: 5px;
    font-weight: bold;
}

div.suggestions span.highlight
{
    font-weight: normal;
}
</style>
</head>
<body>
<form action="" method="get" class="autocomplete"> 
    <input type="text" name="search_input" value="" id="search_input" /><input type="submit" />
</form>
<script type="text/javascript">
new Autocomplete('search_input', {
    serviceUrl: 'autocomplete.php'
});

$('search_input').focus();
</script> 
</body>
</html>
