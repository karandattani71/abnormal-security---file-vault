# Generated by Django 4.2.20 on 2025-04-27 06:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("files", "0003_file_storage_saved_alter_file_file_hash"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="file",
            name="is_duplicate",
        ),
        migrations.RemoveField(
            model_name="file",
            name="reference_file",
        ),
        migrations.RemoveField(
            model_name="file",
            name="storage_saved",
        ),
        migrations.AddField(
            model_name="file",
            name="reference_count",
            field=models.IntegerField(db_index=True, default=1),
        ),
        migrations.AlterField(
            model_name="file",
            name="file_hash",
            field=models.CharField(
                db_index=True, max_length=64, null=True, unique=True
            ),
        ),
    ]
