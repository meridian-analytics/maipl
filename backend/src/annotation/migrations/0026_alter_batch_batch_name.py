from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("annotation", "0025_processedimage_image_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="batch",
            name="batch_name",
            field=models.CharField(max_length=250),
        ),
    ]
