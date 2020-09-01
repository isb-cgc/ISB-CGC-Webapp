from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

import re


class PasswordComplexityValidator:
    def __init__(self, min_length=16, special_char_list="@#$%^&*+=~?;"):
        self.min_length = min_length
        self.special_char_list = special_char_list
        self.complexity = '^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).(?=.*' + ('[%s])' % self.special_char_list) + ('{%s,}$' % self.min_length)

    def validate(self, password, user=None):
        complexity_re = re.compile(self.complexity)

        if not re.match(complexity_re, password):
            raise ValidationError(
                _(
                    "This password must contain at least one each of the following: a lower-case letter, an upper-case letter, "
                    + "a number, and a special character from the set '%(special_chars)s'."
                ),
                code='password_not_complex',
                params={'special_chars': self.special_char_list},
            )

    def password_changed(self, password, user=None):
        complexity_re = re.compile(self.complexity)

        if not re.match(complexity_re, password):
            raise ValidationError(
                _(
                    "This password must contain at least one each of the following: a lower-case letter, an upper-case "
                    + "letter, a number, and a special character from the set '%(special_chars)s'."
                ),
                code='password_not_complex',
                params={'special_chars': self.special_char_list},
            )

def get_help_text(self):
    return _(
        "Your password must contain at least one each of the following: a lower-case letter, an upper-case letter, "
        + "a number, and a special character from the set '%(special_chars)s'." % self.special_char_list
    )