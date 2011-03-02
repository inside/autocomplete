var Autocomplete = Class.create(
{
    instances: [],
    initialize: function(searchInputId, options)
    {
        this.instanceId         = Autocomplete.prototype.instances.push(this) - 1; // Instances tracking. Used by the page's onmouseover event.
        this.searchInputId      = searchInputId; // The input text id to autocomplete on.
        this.suggestionsId      = 'autocomplete_' + searchInputId;
        this.DOMSuggestions     = null;
        this.DOMSearchInput     = $(searchInputId);
        this.suggestions        = [];
        this.selectedIndex      = -1; // Index of the suggested element.
        this.boundKiller        = null; // Used to stop observing the document onclicked outside the search or suggestions.
        this.ignoreValueChange  = false; // Onclick or return events, we don't want to suggest anymore.
        this.cachedResponse     = []; // typedValue/response cache hash table.
        this.onChangeTimeoutId  = null; // Created when request defering.
        this.typedValue         = ''; // What the user types or selects.
        this.inputValue         = ''; // Mirror of the DOM input
        this.lastTypedValue     = ''; // Used when refining locally.
        this.refinedTypedValues = [];
        this.enabled            = false; // Used when nothing is typed.
        this.needsLocalRefine   = false;
        this.isAjaxCallOngoing  = false;

        // Default options, replaced by options on instantiation.
        this.options            =
        {
            serviceUrl         : '',
            autoSubmit         : true, // When an item is selected through a click or return hit, submit the form or not.
            minChars           : 1, // Ajax request starts when minChars is reached.
            deferRequestBy     : 100 // In milliseconds.
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

        if (this.typedValue === this.formatSearchString(this.DOMSearchInput.value))
        {
            return;
        }
        if (this.options.deferRequestBy > 0)
        {
            this.onChangeTimeoutId = setTimeout(this.onChange.bind(this), this.options.deferRequestBy);
        }
        else
        {
            this.onChange();
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
    onChange: function()
    {
        clearTimeout(this.onChangeTimeoutId);
        this.lastTypedValue = this.formatSearchString(this.typedValue);
        this.typedValue     = this.formatSearchString(this.DOMSearchInput.value);
        this.inputValue     = this.DOMSearchInput.value;
        this.selectedIndex  = -1;

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

            if (this.isAjaxCallOngoing)
            {
                return;
            }

            this.suggest();
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
        if (typeof this.suggestions[i] === 'undefined')
        {
            return;
        }

        this.DOMSearchInput.value = this.suggestions[i];

        if (this.options.autoSubmit && this.DOMSearchInput.up('form'))
        {
            this.DOMSearchInput.up('form').submit();
        }

        this.ignoreValueChange = true;
        this.hide();
    },
    getSuggestions: function()
    {
        if (Object.isArray(this.cachedResponse[this.typedValue]))
        {
            this.suggestions = this.cachedResponse[this.typedValue];
            return;
        }
        if (this.needsLocalRefine)
        {
            var refinedTypedValue = this.refinedTypedValues.find(function(item)
            {
                return this.typedValue.startsWith(item);
            }, this);

            if (typeof(refinedTypedValue) !== 'undefined' &&
                this.typedValue.startsWith(refinedTypedValue) &&
                this.typedValue.length > refinedTypedValue.length)
            {
                if (this.suggestions.any(function(item) {return item.startsWith(this.typedValue);}, this))
                {
                    this.refineSuggestions();
                }
                else
                {
                    this.suggestions = [];
                }

                this.cachedResponse[this.typedValue] = this.suggestions;
                return;
            }
            else
            {
                this.needsLocalRefine = false;
            }
        }

        this.isAjaxCallOngoing = true;

        new Ajax.Request(this.options.serviceUrl, {
            onSuccess    : this.processResponse.bind(this),
            sanitizeJSON : true,
            method       : 'get',
            parameters   : {'q': this.typedValue}
        });
    },
    refineSuggestions: function()
    {
        this.suggestions = this.suggestions.findAll(function(item)
        {
            return item.startsWith(this.typedValue);
        }, this);
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
                ' onclick="Autocomplete.prototype.instances[', this.instanceId, '].select(', i, ');"',
                ' onmouseover="Autocomplete.prototype.instances[', this.instanceId, '].activate(', i, ');">',
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

        try
        {
            response = xhr.responseText.evalJSON();

            if (!Object.isArray(response.results))
            {
                response.results = [];
            }
        }
        catch (error)
        {
            return;
        }

        this.cachedResponse[this.typedValue] = response.results;
        this.suggestions = response.results;

        if (this.suggestions.length < 10)
        {
            this.needsLocalRefine = true;
            this.refinedTypedValues.push(this.typedValue);
        }

        this.isAjaxCallOngoing = false;

        if (response.searchedString === this.typedValue)
        {
            this.suggest();
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
    }
});
