; Copyright 2026 Hugo Lee
; SPDX-License-Identifier: Apache-2.0

; Scalar nodes stay cheap: opaque certificate data never goes through word tests.
(word) @string
(string) @string
(base64_data) @string
(url) @string
(bracketed_value) @string
[(number) (address)] @number
(boolean) @boolean
(builtin) @constant.builtin
(escape_sequence) @string.escape
[(parameter) (module_operator)] @variable.parameter
[(comment) (inline_comment)] @comment
[(directive_name) (inline_directive_name)] @keyword.directive
(operator) @operator
"=" @operator
"," @punctuation.delimiter
["(" ")"] @punctuation.bracket

((section_header) @type
  (#set! priority 110))
((assignment name: (name) @property)
  (#set! priority 140))
((attribute name: (name) @property)
  (#set! priority 140))
((base64_attribute name: (word) @property)
  (#set! priority 140))

; Definitions and positional group members are distinct from key=value options.
([(proxy_section (assignment name: (name) @function))
  (group_section (assignment name: (name) @function))
  (named_section (assignment name: (name) @function))]
  (#set! priority 150))
((group_section (assignment values: (values (value) @function)))
  (#set! priority 110))
([(proxy_section (assignment values: (values . (value) @type)))
  (group_section (assignment values: (values . (value) @type)))]
  (#set! priority 120))
((attribute name: (name) @_key value: (value) @type)
  (#eq? @_key "type")
  (#set! priority 120))
([(assignment name: (name) @_key values: (values (value) @function))
  (attribute name: (name) @_key value: (value) @function)]
  (#any-of? @_key "server-proxy-name" "underlying-proxy" "script-name" "default")
  (#set! priority 120))
((group_section (assignment values: (values
  (attribute name: (name (string)) value: (value) @function))))
  (#set! priority 120))

; Raw/inline rule sets have no policy field; FINAL has no condition field.
[(rule kind: (word) @keyword) (predicate kind: (word) @keyword)]
((rule policy: (value) @function)
  (#set! priority 110))
([(rule option: (value) @attribute) (predicate option: (value) @attribute)]
  (#set! priority 110))
((rule kind: (word) @_kind condition: (value) @function)
  (#eq? @_kind "FINAL")
  (#set! priority 120))
((rule kind: (word) @_kind policy: (value) @attribute)
  (#eq? @_kind "FINAL")
  (#set! priority 120))
([(source_file (rule policy: (value) @attribute))
  (ruleset_section (rule policy: (value) @attribute))]
  (#set! priority 120))

; Primitive tokens are classified by the compiled lexer.
((value (builtin) @constant.builtin)
  (#set! priority 125))
([(assignment name: (name) @_key values: (values (value) @string.special.path))
  (attribute name: (name) @_key value: (value) @string.special.path)]
  (#lua-match? @_key "%-path$")
  (#set! priority 120))
((directive name: (directive_name) @_directive [(word) (url)] @string.special.path)
  (#eq? @_directive "#!include")
  (#set! priority 120))
((directive name: (directive_name) @_directive (string) @string.special.path)
  (#eq? @_directive "#!include")
  (#set! priority 120))
((inline_directive (word) @variable . (operator))
  (#set! priority 110))
