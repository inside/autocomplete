var Autocomplete = Class.create(
{
    initialize: function(searchInputId, options)
    {
        this.instanceId        = Autocomplete.instances.push(this) - 1; // Instances tracking. Used by the page's onmouseover event.
        this.searchInputId     = searchInputId;                         // The input text id to autocomplete on.
        this.suggestionsId     = 'autocomplete_' + searchInputId;
        this.DOMSuggestions    = null;
        this.DOMSearchInput    = $(searchInputId);
        this.suggestions       = [];
        this.selectedIndex     = -1;    // Index of the suggested element.
        this.boundKiller       = null;  // Used to stop observing the document onclicked outside the search or suggestions.
        this.ignoreValueChange = false; // Onclick or return events, we don't want to suggest anymore.
        this.cachedResponse    = [];    // typedValue/response cache hash table.
        this.onChangeTimeoutId = null;
        this.typedValue        = '';    // What the user types or selects.
        this.inputValue        = '';    // Mirror of the DOM input
        this.lastTypedValue    = '';    // Used when refining locally.
        this.enabled           = false; // Used when nothing is typed.
        this.refineLocally     = false; // If less than 10 results, refine results locally (no additionnal ajax request).
        this.options           =        // Default options, replaced by options on instantiation.
        {
            serviceUrl         : '',
            autoSubmit         : true,  // When an item is selected through a click or return hit, submit the form or not.
            minChars           : 1,     // Ajax request starts when minChars is reached.
            deferRequestBy     : 100    // In milliseconds.
        };

        Object.extend(this.options, options);
        this.DOMSearchInput.setAttribute('autocomplete', 'off');
        this.DOMSearchInput.observe('keydown', this.onKeyDown.bind(this));
        this.DOMSearchInput.observe('keyup', this.onKeyUp.bind(this));
        this.DOMSearchInput.observe('blur', this.enablekiller.bind(this));
    },
    createDOMSuggestions: function()
    {
        var div = new Element('div', {'id': this.suggestionsId}).setStyle({display: 'none'});
        this.DOMSearchInput.up('form').appendChild(div);
        this.DOMSuggestions = $(this.suggestionsId);
    },
    onKeyDown: function(event)
    {
        if (!this.enabled)
        {
            return;
        }
        switch (event.keyCode)
        {
            case Event.KEY_ESC:
                this.hide();
                break;
            case Event.KEY_RETURN:
                if (this.selectedIndex === -1)
                {
                    this.hide();
                    return;
                }
                this.select(this.selectedIndex);
                break;
            case Event.KEY_UP:
                this.moveUp();
                break;
            case Event.KEY_DOWN:
                this.moveDown();
                break;
            default:
                return;
        }

        event.stop();
    },
    onKeyUp: function(event)
    {
        switch (event.keyCode)
        {
            case Event.KEY_UP:
            case Event.KEY_DOWN:
            case Event.KEY_RETURN:
            case Event.KEY_ESC:
                return;
        }

        clearTimeout(this.onChangeTimeoutId);
        this.ignoreValueChange = false;

        if (this.typedValue === this.DOMSearchInput.value.toLowerCase())
        {
            return;
        }
        if (this.options.deferRequestBy > 0)
        {
            this.onChangeTimeoutId = setTimeout(this.onValueChange.bind(this), this.options.deferRequestBy);
        }
        else
        {
            this.onValueChange();
        }
    },
    enablekiller: function()
    {
        if (this.boundKiller === null)
        {
            this.boundKiller = this.killer.bind(this);
            document.observe('click', this.boundKiller);
        }
    },
    disablekiller: function()
    {
        if (this.boundKiller !== null)
        {
            document.stopObserving('click', this.boundKiller);
            this.boundKiller = null;
        }
    },
    killer: function(event)
    {
        if (!event.findElement('#' + this.suggestionsId) && !event.findElement('#' + this.searchInputId))
        {
            this.hide();
            this.disablekiller();
        }
    },
    hide: function()
    {
        this.enabled = false;
        this.selectedIndex = -1;

        if (this.DOMSuggestions)
        {
            this.DOMSuggestions.hide();
        }
    },
    moveUp: function()
    {
        if (this.selectedIndex === -1)
        {
            this.selectedIndex = this.suggestions.length;
            this.activate(this.selectedIndex - 1);
            this.DOMSearchInput.value = this.suggestions[this.selectedIndex];
            return;
        }
        if (this.selectedIndex === 0)
        {
            this.DOMSuggestions.firstChild.childNodes[0].removeClassName('selected');
            this.selectedIndex = -1;
            this.DOMSearchInput.value = this.inputValue;
            return;
        }

        this.activate(this.selectedIndex - 1);
        this.DOMSearchInput.value = this.suggestions[this.selectedIndex];
    },
    moveDown: function()
    {
        if (this.selectedIndex === this.suggestions.length - 1)
        {
            this.DOMSuggestions.firstChild.childNodes[this.selectedIndex].removeClassName('selected');
            this.selectedIndex = -1;
            this.DOMSearchInput.value = this.inputValue;
            return;
        }

        this.activate(this.selectedIndex + 1);
        this.DOMSearchInput.value = this.suggestions[this.selectedIndex];
    },
    onValueChange: function()
    {
        clearTimeout(this.onChangeTimeoutId);
        this.lastTypedValue = this.typedValue.toLowerCase();
        this.typedValue = this.formatSearchString(this.DOMSearchInput.value);
        this.inputValue = this.DOMSearchInput.value;
        this.selectedIndex = -1;

        if (!$(this.suggestionsId))
        {
            this.createDOMSuggestions();
        }
        if (this.ignoreValueChange)
        {
            this.ignoreValueChange = false;
            return;
        }
        if (this.typedValue.blank() || this.typedValue.length < this.options.minChars)
        {
            this.hide();
        }
        else
        {
            this.getSuggestions();
        }
    },
    formatSearchString: function(s)
    {
        s = s.gsub(/\s{2,}/, ' '); // Replaces more than 2 spaces with one
        s = s.gsub(/^\s+/, '');    // Trims beginning whitespace
        s = s.toLowerCase();

        return s;
    },
    select: function(i)
    {
        var selectedValue = this.suggestions[i];

        if (selectedValue)
        {
            this.DOMSearchInput.value = selectedValue;
            if (this.options.autoSubmit && this.DOMSearchInput.up('form'))
            {
                this.DOMSearchInput.up('form').submit();
            }
            this.ignoreValueChange = true;
            this.hide();
        }
    },
    getSuggestions: function()
    {
        if (Object.isArray(this.cachedResponse[encodeURIComponent(this.accentsTidy(this.typedValue))]))
        {
            this.suggestions = this.cachedResponse[encodeURIComponent(this.accentsTidy(this.typedValue))];
            this.suggest();
        }
        else
        {
            if (this.refineLocally)
            {
                if (!this.lastTypedValue.blank() && this.DOMSearchInput.value.toLowerCase().startsWith(this.lastTypedValue))
                {
                    this.suggestions = this.suggestions.findAll(function(o)
                    {
                        return this.accentsTidy(o).startsWith(this.accentsTidy(this.typedValue));
                    }, this);
                    this.cachedResponse[encodeURIComponent(this.accentsTidy(this.typedValue))] = this.suggestions;
                    this.suggest();
                    return;
                }
                else
                {
                    this.refineLocally = false;
                }
            }

            new Ajax.Request(this.options.serviceUrl, {
                onComplete: this.processResponse.bind(this),
                sanitizeJSON: true,
                method: 'get',
                parameters: {'q': this.typedValue}
            });
        }
    },
    suggest: function()
    {
        if (this.suggestions.length === 0)
        {
            this.hide();
            return;
        }

        var content = [];

        content.push('<div class="suggestions">');
        this.suggestions.each(function(value, i)
        {
            content.push
            (
                (this.selectedIndex === i ? '<div class="selected"' : '<div'),
                ' onclick="Autocomplete.instances[', this.instanceId, '].select(', i, ');"',
                ' onmouseover="Autocomplete.instances[', this.instanceId, '].activate(', i, ');">',
                '<span class="suggestion">', this.highlight(value), '</span>', '</div>'
            );
        }.bind(this));
        content.push('</div>');

        this.enabled = true;
        this.DOMSuggestions.update(content.join('')).show();
    },
    highlight: function(s)
    {
        return s.gsub(new RegExp('(^' + this.typedValue + ')'), '<span class="highlight">#{1}</span>');
    },
    processResponse: function(xhr)
    {
        var response;
        var searchedString;

        try
        {
            response = xhr.responseText.evalJSON();
            searchedString = response.searchedString;

            if (!Object.isArray(response.results))
            {
                response.results = [];
            }
        }
        catch (err)
        {
            return;
        }

        this.cachedResponse[encodeURIComponent(this.accentsTidy(this.typedValue))] = response.results;
        this.suggestions = response.results;

        if (this.suggestions.length < 10)
        {
            this.refineLocally = true;
        }
        if (encodeURIComponent(searchedString) === encodeURIComponent(this.formatSearchString(this.DOMSearchInput.value)))
        {
            this.getSuggestions();
        }
    },
    activate: function(index)
    {
        var childs = this.DOMSuggestions.firstChild.childNodes;
        var activeItem;

        // Clear previous selection
        if (this.selectedIndex !== -1 && childs.length > this.selectedIndex)
        {
            childs[this.selectedIndex].removeClassName('selected');
        }

        this.selectedIndex = index;

        if (this.selectedIndex !== -1 && childs.length > this.selectedIndex)
        {
            activeItem = $(childs[this.selectedIndex]);
            activeItem.addClassName('selected');
        }

        return activeItem;
    },
    accentsTidy: function(s)
    {
        var r = s.toLowerCase();
        r = r.replace(new RegExp('[àáâãäå]', 'g'), 'a');
        r = r.replace(new RegExp('ç', 'g')       , 'c');
        r = r.replace(new RegExp('[èéêë]', 'g')  , 'e');
        r = r.replace(new RegExp('[ìíîï]', 'g')  , 'i');
        r = r.replace(new RegExp('ñ', 'g')       , 'n');                            
        r = r.replace(new RegExp('[òóôõö]', 'g') , 'o');
        r = r.replace(new RegExp('[ùúûü]', 'g')  , 'u');
        r = r.replace(new RegExp('[ýÿ]', 'g')    , 'y');
        return r;
    }
});

Autocomplete.instances = [];
