# Template syntax

The module author defines controls and template rules. The client sees ordinary controls, toggles and item cards. These rules run in the editor, not per subscriber at send time. Use AMPscript separately for send-time personalisation.

## Named values

Choose **+ Add field**, choose the control type, then use **Advanced options > Create a template control**. Its template key is under **Advanced** in the field editor. Insert the reference using **Advanced tools > Template code**:

```html
<td style="background-color:{{ background_colour }};">
  <h2>{{ title }}</h2>
  <p>{{ description | richtext }}</p>
</td>
```

Use the colour type for `background_colour`, plain text for `title`, and formatted text for `description`. Keys are case-sensitive and use letters, numbers and underscores, starting with a letter or underscore. Use the available-values panel to confirm actual keys.

Values are HTML-escaped by default. `| escape` is explicit escaping; `| richtext` permits sanitised inline formatting. For Formatted text fields, this preserves supported superscript/subscript and colour spans and applies the field’s configured link appearance, including within repeated items. There is no raw HTML filter. Quote attribute values and use URL/image controls for URL expressions. Template syntax cannot infer the correct field type for you. Keep CSS structure, tag names and attribute names in the authored template.

## Conditions and alternatives

```html
{% if show_title %}
  <h2>{{ title }}</h2>
{% endif %}

{% if layout == 'detailed' %}
  <p>{{ description | richtext }}</p>
{% elsif layout == 'compact' %}
  <p>{{ summary }}</p>
{% else %}
  <p>Discover more below.</p>
{% endif %}

{% if show_cta and cta_url != blank %}
  <a href="{{ cta_url }}">{{ cta_label }}</a>
{% endif %}
```

Define `show_title` and `show_cta` as toggles. Define `layout` as a dropdown whose inserted values include `detailed` and `compact`. Define the remaining fields with appropriate text or URL types.

Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `and`, `or`, `not`, and parentheses. Literals include quoted strings, numbers, `true`, `false`, `nil`/`null` and `blank` (the empty string). Comparisons use strict equality for `==` and `!=`. Use Number fields for numeric comparisons.

False, null, empty strings and the internal hidden-toggle value are false-like. Zero and empty arrays are truthy; use `.size` to check list length. This intentionally differs from some Liquid implementations. Boolean operands are evaluated eagerly. An unknown name is an error, so define every referenced field rather than using a condition to guard undefined fields.

Required values inside omitted branches are not evaluated during rendering. Field definitions still require valid starting values when saved/exported.

## Repeated items

Create a Repeatable list with key `bullets`, then an item field with key `text`:

```html
<ul>
{% for item in bullets %}
  <li>{{ item.text }}</li>
{% else %}
  <li>No benefits have been added yet.</li>
{% endfor %}
</ul>
```

The loop's optional `else` branch is used when the list is empty. Omit it to output no items. Use a surrounding `if bullets.size > 0` if the entire wrapper should disappear for an empty list.

Items can contain several controls:

```html
{% for slide in slides %}
  <div id="{{ block_id }}-slide-{{ forloop.index }}">
    <img src="{{ slide.image }}" alt="{{ slide.alt }}">
    {% if slide.show_caption %}<p>{{ slide.caption }}</p>{% endif %}
  </div>
{% endfor %}
```

For this example, define a list `slides` with item keys `image` (Image URL), `alt` (Plain text), `show_caption` (Toggle) and `caption` (Plain text). This example repeats slide content only; it is not a complete email carousel.

Available loop properties: `forloop.index` (starts at 1), `index0`, `first`, `last`, `length`. Nested loops use their own loop context and retain outer item variables. Each list has configurable minimum and maximum items, up to 200. The editor creates a single level of item fields; nested list schemas are not exposed in its UI.

`block_id` is generated and persisted by the runtime. A duplicated SFMC block can inherit saved metadata, including this ID. Do not assume IDs remain unique across duplication; check and resolve collisions in interactive email designs. Interactive carousel controls and fallbacks require dedicated module code and email-client testing.

## Limits and errors

Supported tags are `if`, `elsif`/`elseif`, `else`, `endif`, `for` and `endfor`. Supported output filters are `escape` and `richtext`. There is no `assign`, `capture`, `include`, arithmetic output, range-loop syntax or general JavaScript execution.

Unknown fields, unsupported tags, malformed conditions and missing closing tags report an error. Runtime limits are 20 nested levels, 1,000 loop iterations per render and 2 MB rendered output. Field/item limits apply separately.

Literal AMPscript blocks are preserved, including Liquid-like text inside AMPscript. Other template languages using `{{...}}` or `{%...%}` should not be mixed into template-mode modules.
