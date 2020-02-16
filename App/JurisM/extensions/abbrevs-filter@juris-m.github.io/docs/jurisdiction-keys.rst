^^^^^^^^^^^^^^^^^
Jurisdiction keys
^^^^^^^^^^^^^^^^^

The ``default`` jurisdiction segment is required. Abbreviations
that are not applied exclusively to legal materials of a specific
jurisdiction should be placed under this key.

Additional jurisdictions may be included in a source file, with a
jurisdiction code drawn from the `Legal Resource Registry`__ (LRR) as key.
Each jurisdiction segment must have the full set of category keys
shown above. [#]_

LRR keys have a colon-delimited path-like structure. If a key with multiple
path elements is included in a source file, keys for the parent elements
must also be included. For example, if the key ``us:c9`` is included
(corresponding to the Ninth Circuit of the U.S. federal court system),
then ``us`` must also be included.

__ https://fbennett.github.io/legal-resource-registry

.. [#] Actually, this is not true, I think, but it is good
       practice.

