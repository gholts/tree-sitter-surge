// Copyright 2026 Hugo Lee
// SPDX-License-Identifier: Apache-2.0

// Structural editor grammar. surge-cli owns option and policy validation.
const commaSep1 = (rule) => seq(rule, repeat(seq(",", rule)));
const section = ($, header) =>
  prec.right(
    seq(
      header,
      optional($._suffix),
      repeat(seq($._newline, optional($._entry))),
    ),
  );
const heading = ($, pattern) =>
  alias(token(prec(2, pattern)), $.section_header);
module.exports = grammar({
  name: "surge",
  extras: () => [/[ \t\f]/],
  // Prefer complete attributes, but keep trailing '=' valid in encoded values.
  conflicts: ($) => [[$._key, $._atom]],
  rules: {
    source_file: ($) =>
      seq(
        repeat(choice($._newline, seq($._entry, $._newline))),
        optional(
          choice(
            $._entry,
            repeat1(
              choice(
                $.section,
                $.proxy_section,
                $.group_section,
                $.named_section,
                $.ruleset_section,
              ),
            ),
          ),
        ),
      ),
    section: ($) => section($, $.section_header),
    proxy_section: ($) => section($, heading($, /\[[ \t]*Proxy[ \t]*\]/)),
    group_section: ($) => section($, heading($, /\[[ \t]*Proxy Group[ \t]*\]/)),
    named_section: ($) =>
      section($, heading($, /\[[ \t]*(Script|Panel|Keystore)[ \t]*\]/)),
    ruleset_section: ($) =>
      section($, heading($, /\[[ \t]*Ruleset[ \t]+[^\]\r\n]+\]/)),
    section_header: () => token(prec(1, /\[[^\]\r\n]+\]/)),
    _entry: ($) =>
      prec.right(
        seq(
          choice(
            $.assignment,
            $.rule,
            $.directive,
            $.comment,
            $.bare_statement,
          ),
          optional($._suffix),
        ),
      ),
    _newline: () => /\r?\n/,
    _suffix: ($) => choice($.inline_comment, $.inline_directive),

    assignment: ($) =>
      prec.right(
        2,
        seq(
          field("name", alias($._text, $.name)),
          "=",
          field("values", $.values),
        ),
      ),
    _text: ($) => prec.right(seq($._atom, repeat($._atom))),
    values: ($) => commaSep1(choice($.base64_attribute, $.attribute, $.value)),
    _key: ($) => choice($.word, $.string),
    attribute: ($) =>
      prec.dynamic(
        1,
        seq(field("name", alias($._key, $.name)), "=", field("value", $.value)),
      ),
    base64_attribute: ($) =>
      prec(
        2,
        seq(
          field("name", alias("base64", $.word)),
          "=",
          field("value", choice($.base64_data, $.string)),
        ),
      ),
    base64_data: () => token(/[A-Za-z0-9+/]+={0,2}/),
    value: ($) =>
      prec.right(
        seq($._text, optional(seq("=", repeat(choice($._atom, "="))))),
      ),
    _atom: ($) =>
      choice(
        $.boolean,
        $.number,
        $.address,
        $.builtin,
        $.url,
        $.word,
        alias("base64", $.word),
        $.string,
        $.parameter,
        $.module_operator,
        $.parenthesized_value,
        $.bracketed_value,
      ),
    parenthesized_value: ($) =>
      seq("(", optional(choice($.value, commaSep1($.attribute))), ")"),
    bracketed_value: () => token(/\[[^\]\r\n]*\]/),
    boolean: () => choice("true", "false", "enabled", "disabled"),
    number: () => /[+-]?[0-9]+(?:\.[0-9]+)?/,
    address: () =>
      choice(
        /(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:[/:][0-9]+)?/,
        /(?:[0-9a-fA-F]{0,4}:){2,}[0-9a-fA-F:]*(?:\/[0-9]+)?/,
        token(prec(1, /\[[0-9a-fA-F]*:[0-9a-fA-F:]+\](?::[0-9]+)?/)),
      ),
    builtin: () => choice("DIRECT", /REJECT(?:-[A-Z-]+)?/),
    url: () => /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^ \t\r\n,()"']+/,
    word: () => token(/[^ \t\r\n,=()\[\]"'#;<>!][^ \t\r\n,=()"'<>!]*/),

    rule: ($) =>
      seq(
        field("kind", $.word),
        ",",
        field("condition", choice($.value, $.logical_group)),
        optional(
          seq(
            ",",
            field("policy", $.value),
            repeat(seq(",", field("option", $.value))),
          ),
        ),
      ),
    logical_group: ($) => seq("(", commaSep1($.predicate), ")"),
    predicate: ($) =>
      seq(
        "(",
        field("kind", $.word),
        ",",
        field("condition", choice($.value, $.logical_group)),
        repeat(seq(",", field("option", $.value))),
        ")",
      ),
    bare_statement: ($) => alias($._text, $.value),

    string: ($) =>
      choice(
        seq(
          '"',
          repeat(
            choice(
              $.escape_sequence,
              $.parameter,
              token.immediate(/[^"\\{\r\n]+/),
              "{",
            ),
          ),
          '"',
        ),
        seq(
          "'",
          repeat(
            choice(
              $.escape_sequence,
              $.parameter,
              token.immediate(/[^'\\{\r\n]+/),
              "{",
            ),
          ),
          "'",
        ),
      ),
    escape_sequence: () => token.immediate(seq("\\", /[^\r\n]/)),
    parameter: () => token(prec(2, /\{\{\{[A-Za-z0-9_]+\}\}\}/)),
    module_operator: () => token(prec(2, /%[A-Z][A-Z0-9_]*%/)),
    directive: ($) =>
      prec.right(
        seq(field("name", $.directive_name), repeat($._directive_atom)),
      ),
    inline_directive: ($) =>
      prec.right(
        seq(field("name", $.inline_directive_name), repeat($._directive_atom)),
      ),
    directive_name: () => token(prec(2, /(?:#!|\/\/!)[A-Za-z0-9_-]+/)),
    inline_directive_name: () =>
      token(prec(3, /[ \t]+(?:#!|\/\/!)[A-Za-z0-9_-]+/)),
    _directive_atom: ($) =>
      choice(
        $.boolean,
        $.number,
        $.address,
        $.builtin,
        $.url,
        $.word,
        $.string,
        $.parameter,
        $.module_operator,
        $.operator,
        ",",
        "(",
        ")",
      ),
    operator: () => choice("=", "==", "!=", "<=", ">=", "<", ">", "&&", "||"),
    comment: () => token(choice(/#[^\r\n]*/, /;[^\r\n]*/, /\/\/[^\r\n]*/)),
    inline_comment: () => token(prec(1, /[ \t]+(?:#|;|\/\/)[^\r\n]*/)),
  },
});
