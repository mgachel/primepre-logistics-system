from django.db import migrations


def fix_unique_constraint(apps, schema_editor):
    """
    Fix the unique constraint issue safely across SQLite and PostgreSQL.
    Keeps all CargoItem entries intact.
    """
    connection = schema_editor.connection
    vendor = connection.vendor  # 'sqlite', 'postgresql', 'mysql', etc.

    with connection.cursor() as cursor:
        if vendor == 'postgresql':
            # ✅ PostgreSQL path
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'cargo_cargoitem' 
                AND constraint_name = 'unique_container_client_tracking'
            """)
            has_old_constraint = cursor.fetchone()

            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'cargo_cargoitem' 
                AND constraint_name = 'unique_container_client'
            """)
            has_new_constraint = cursor.fetchone()

            if has_old_constraint:
                cursor.execute("""
                    ALTER TABLE cargo_cargoitem 
                    DROP CONSTRAINT unique_container_client_tracking
                """)
                print("✓ Removed old constraint: unique_container_client_tracking")
            else:
                print("✓ Old constraint already removed")

            if not has_new_constraint:
                cursor.execute("""
                    ALTER TABLE cargo_cargoitem 
                    ADD CONSTRAINT unique_container_client 
                    UNIQUE (container_id, client_id)
                """)
                print("✓ Added new constraint: unique_container_client")
            else:
                print("✓ Constraint unique_container_client already exists")

        elif vendor == 'sqlite':
            # ✅ SQLite path (no information_schema)
            # Check constraints using pragma
            cursor.execute("PRAGMA index_list('cargo_cargoitem');")
            indexes = cursor.fetchall()
            index_names = [i[1] for i in indexes]

            if 'unique_container_client' in index_names:
                print("✓ SQLite: constraint already exists (index unique_container_client)")
            else:
                # SQLite only allows adding UNIQUE constraints by creating a new index
                cursor.execute("""
                    CREATE UNIQUE INDEX unique_container_client 
                    ON cargo_cargoitem (container_id, client_id);
                """)
                print("✓ SQLite: added unique index for (container_id, client_id)")

        else:
            print(f"⚠️ Skipped constraint fix — unsupported DB vendor: {vendor}")


class Migration(migrations.Migration):

    dependencies = [
        ('cargo', '0013_remove_duplicate_container_clients'),
    ]

    operations = [
        migrations.RunPython(
            fix_unique_constraint,
            migrations.RunPython.noop
        ),
    ]
