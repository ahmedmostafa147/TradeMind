import 'package:flutter/material.dart';

/// Renders the official app logo next to the screen title in the AppBar.
class AppLogoTitle extends StatelessWidget {
  final String title;
  final double logoSize;

  const AppLogoTitle({super.key, required this.title, this.logoSize = 30.0});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8.0),
          child: Image.asset(
            'assets/logo.png',
            width: logoSize,
            height: logoSize,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                const SizedBox.shrink(),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
