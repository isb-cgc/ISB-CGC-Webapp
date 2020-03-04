from django import forms

BOOL_CHOICES = (
    (True, 'Yes'),
    (False, 'No')
)


class OptInForm(forms.Form):
    user_email = forms.EmailField(
        label='Email',
        max_length=10000,
        required=True
    )

    first_name = forms.CharField(
        label='First name',
        max_length=10000,
        required=True
    )

    last_name = forms.CharField(
        label='Last name',
        max_length=10000,
        required=True
    )

    affiliation = forms.CharField(
        label='Affiliation',
        max_length=10000,
        required=True
    )

    opted_in = forms.ChoiceField(
        widget=forms.Select(),
        choices=BOOL_CHOICES,
        initial="",
        label="It is OK to contact me with occasional communication about ISB-CGC updates",
        required=True
    )

    feedback = forms.CharField(
        widget=forms.Textarea,
        label="Do you have questions about ISB-CGC? Suggestions about what it \
         should or should not do? Ideas for collaboration? We'd love to hear from you!",
        max_length=10000
    )
