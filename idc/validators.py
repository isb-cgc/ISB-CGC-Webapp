from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.contrib.auth.hashers import check_password
from django.conf import settings
import logging
from accounts.models import PasswordHistory

import re

logger = logging.getLogger(__name__)


class PasswordReuseValidator:
    def __init__(self):
        pass

    def check_for_reuse(self, password, user):
        # Users who are signing up logically have no password history
        # Their 'user' object will have a DeferredAttribute type for the int, so if
        # user.id isn't an int, there's nothing to check.
        if type(user.id) == int:
            password_history = PasswordHistory.objects.filter(user=user)
            for pwd_history in password_history:
                if check_password(password, pwd_history.password_hash):
                    raise ValidationError(_("You cannot use the same password. Please choose a new password."))
        else:
            logger.info("[STATUS] Skipping password re-use validator: user is signing up.")

    def validate(self, password, user=None):
        if user:
            self.check_for_reuse(password, user)

    def password_changed(self, password, user=None):
        if user:
            self.check_for_reuse(password, user)

    def get_help_text(self):
        return _("You cannot re-use the same password. Please choose a new password.")


class PasswordComplexityValidator:
    def __init__(self, min_length=16, special_char_list="@#$%^&*+~?;"):
        self.min_length = min_length
        self.special_char_list = special_char_list
        self.complexity = ('^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[%s])' % self.special_char_list) + ('.{%s,}$' % self.min_length)
        self.allowances_complexity = '^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])' + ('.{%s,}$' % 35)

    def check_for_complexity(self, password, user):
        complexity_re = re.compile(self.complexity)

        if user.username not in settings.ACCOUNTS_ALLOWANCES:
            if not re.match(complexity_re, password):
                raise ValidationError(
                    _(
                        "This password must contain at least one each of the following: a lower-case letter, an upper-case letter, "
                        + "a number, and a special character from the set '%(special_chars)s'."
                    ),
                    code='password_not_complex',
                    params={'special_chars': self.special_char_list},
                )
        else:
            if not settings.IS_DEV:
                complexity_re = re.compile(self.allowances_complexity)
                if not re.match(complexity_re, password):
                    raise ValidationError(
                        _(
                            "This password must contain at least one each of the following: a lower-case letter, an upper-case letter, "
                            + "and a number"
                        ),
                        code='password_not_complex'
                    )

    def validate(self, password, user=None):
        self.check_for_complexity(password, user)

    def password_changed(self, password, user=None):
        self.check_for_complexity(password, user)

    def get_help_text(self):
        return _(
            "Your password must contain at least one each of the following: a lower-case letter, an upper-case letter, "
            + ("a number, and a special character from the set '%s'." % self.special_char_list)
        )