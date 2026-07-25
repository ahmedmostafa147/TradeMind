import 'package:flutter/material.dart';

import '../services/egx_market_service.dart';

/// Ticker input with EGX name resolution and suggestions.
///
/// Typing "بنك" or "COM" offers matching EGX codes, and once a known code is
/// entered its Arabic name is shown underneath — so a trade is never saved
/// against a code the trader only half-remembered.
///
/// Suggestions come from the bundled directory rather than a lookup service:
/// Yahoo's search endpoint does not resolve EGX codes (searching "COMI" returns
/// a Chinese company, "TMGH" returns nothing), and this works offline.
class TickerField extends StatefulWidget {
  final TextEditingController controller;
  final String? Function(String?)? validator;

  /// Called after a suggestion is tapped, so the parent can refresh anything
  /// keyed off the ticker.
  final VoidCallback? onChanged;

  const TickerField({
    super.key,
    required this.controller,
    this.validator,
    this.onChanged,
  });

  @override
  State<TickerField> createState() => _TickerFieldState();
}

class _TickerFieldState extends State<TickerField> {
  /// Enough to choose from without turning the form into a list screen.
  static const _maxSuggestions = 6;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    if (!mounted) return;
    setState(() {});
    // The parent needs to know too, not just this field. The quick-add sheet
    // keys its quote badge and its save button off the ticker text, and typing
    // a code by hand — the common case — used to notify nobody, so neither
    // updated until some other field was touched.
    widget.onChanged?.call();
  }

  void _select(String code) {
    // One `value` assignment, not `..text` then `..selection`: each of those
    // notifies separately, and the listener now rebuilds the parent, so the
    // cascade cost two rebuilds per tap. Calling onChanged here as well would
    // have made it three.
    widget.controller.value = TextEditingValue(
      text: code,
      selection: TextSelection.collapsed(offset: code.length),
    );
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final raw = widget.controller.text.trim();
    final resolvedName = EgxMarketService.nameFor(raw);

    // Once the code resolves exactly there is nothing left to suggest.
    final suggestions = (raw.isEmpty || resolvedName != null)
        ? const <MapEntry<String, String>>[]
        : EgxMarketService.search(raw).take(_maxSuggestions).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: widget.controller,
          textCapitalization: TextCapitalization.characters,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'رمز السهم',
            hintText: 'COMI',
          ),
          validator: widget.validator,
        ),

        if (resolvedName != null) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                size: 16,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  resolvedName,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],

        if (suggestions.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in suggestions)
                ActionChip(
                  onPressed: () => _select(entry.key),
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        entry.key,
                        // Latin code inside an RTL form.
                        textDirection: TextDirection.ltr,
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        entry.value,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
