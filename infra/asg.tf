data "aws_ami" "pulsewatch" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:pulsewatch"
    values = ["true"]
  }
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.pulsewatch.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  # The app + systemd service are already baked into the AMI by Packer.
  # user_data here only drops in secrets that weren't known at build time,
  # then restarts the already-enabled service to pick them up.
  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    db_host     = aws_db_instance.main.address
    db_name     = var.db_name
    db_user     = var.db_username
    db_password = var.db_password
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${var.project_name}-app" }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  min_size            = var.asg_min_size
  max_size            = var.asg_max_size
  desired_capacity    = var.asg_desired_capacity
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-app"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.app.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 60
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }
}
