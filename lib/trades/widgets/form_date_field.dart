import 'package:flutter/material.dart';

import '../../core/formatters.dart';

class FormDateField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime> onPick;
  final VoidCallback? onClear;
  final String? errorText;

  const FormDateField({
    super.key,
    required this.label,
    required this.value,
    required this.onPick,
    this.onClear,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: InputDecoration(labelText: label, errorText: errorText),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: value ?? DateTime.now(),
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (picked != null) {
                  onPick(DateTime(picked.year, picked.month, picked.day));
                }
              },
              child: Text(
                value == null ? '—' : toWesternDigits(dateLabel(value)),
                textDirection: TextDirection.ltr,
                textAlign: TextAlign.right,
              ),
            ),
          ),
          if (onClear != null && value != null)
            IconButton(
              icon: const Icon(Icons.clear, size: 18),
              onPressed: onClear,
              tooltip: 'مسح التاريخ',
            ),
        ],
      ),
    );
  }
}
