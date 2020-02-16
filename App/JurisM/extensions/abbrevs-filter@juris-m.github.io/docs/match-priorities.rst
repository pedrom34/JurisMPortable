^^^^^^^^^^^^^^^^
Match priorities
^^^^^^^^^^^^^^^^

Values presented for abbreviation are associated with an ``Item`` and
with a variable name. The Filter will attempt a match of the value against
the keys of a category corresponding to the variable name (see below),
under the jurisdiction set on the ``Item``. If the attempt fails, and
if the jurisdiction is not ``default``, a right-side element of the
jurisdiction key is removed, and the attempt is repeated. When no
element remain, the ``default`` jurisdiction is attempted.

If no match is found, the value is returned verbatim. If a match
is found, the abbreviation is returned.

